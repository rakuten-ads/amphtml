/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {AmpA4A} from '../../amp-a4a/0.1/amp-a4a';
import {Layout, isLayoutSizeDefined} from '../../../src/layout';
import {Services} from '../../../src/services';
import {addParamsToUrl, parseQueryString} from '../../../src/url';
import {createElementWithAttributes} from '../../../src/dom';
import {dict} from '../../../src/utils/object';
import {insertAnalyticsElement} from '../../../src/extension-analytics';
import {tryParseJson} from '../../../src/json';
import {user} from '../../../src/log';

/**
 * RUNA endpoint for AMP
 *
 * @type {string}
 * @private
 */
const RUNA_A4A_ENDPOINT = 'https://s-ad.rmp.rakuten.co.jp/amp';

/** @const {string} */
const TAG = 'amp-ad-network-runa-impl';

export class AmpAdNetworkRUNAImpl extends AmpA4A {
  /**
   * @param {!Element} element
   */
  constructor(element) {
    super(element);

    /** @private {?{width: number, height: number}} */
    this.originalSize_ = null;

    /** @private {?number}} */
    this.maxWidth_ = null;

    /** @private {boolean} */
    this.isFluidAd_ = false;

    /** @private {boolean} */
    this.isFullWidth_ = false;

    /** @private */
    this.trackerConfig_ = null;

    /** @private */
    this.analyticsConfig_ = null;

    /** @private */
    this.analyticsElement_ = null;

    /** @private {boolean} */
    this.expandedFluidAd_ = false;

    /** @private {!../../../src/service/extensions-impl.Extensions} */
    this.extensions_ = Services.extensionsFor(this.win);
  }

  /**
  /** @override */
  getAdUrl() {
    const fullWidthAttr = this.element.getAttribute('data-full-width');
    this.isFullWidth_ = fullWidthAttr === '' || fullWidthAttr === 'true';
    const pageParams = parseQueryString(
      (this.win.location && this.win.location.search) || ''
    );
    const ep = this.element.getAttribute('src') || RUNA_A4A_ENDPOINT;
    const viewportSize = this.getViewport().getSize();
    const params = {
      id: this.element.getAttribute('data-id'),
      dbg: pageParams['debug'] || '',
      json: this.element.getAttribute('json'),
      vw: viewportSize.width,
      vh: viewportSize.height,
      f: this.isFluidAd_,
      fw: this.isFullWidth_,
    };
    return addParamsToUrl(ep, params);
  }

  /** @override */
  onCreativeRender(creativeMetaData, opt_onLoadPromise) {
    super.onCreativeRender(creativeMetaData, opt_onLoadPromise);
    if (!this.analyticsElement_ && this.analyticsConfig_) {
      this.a4aAnalyticsElement_ = insertAnalyticsElement(
        this.element,
        this.analyticsConfig_,
        true /* loadAnalytics */
      );
    }
    this.fireMeasuredEvents();
    this.attemptExpandFluidAd();
  }

  /** @override */
  isLayoutSupported(layout) {
    this.isFluidAd_ = layout == Layout.FLUID;
    return isLayoutSizeDefined(layout);
  }

  /** @override */
  extractSize(responseHeaders) {
    const size = super.extractSize(responseHeaders);
    this.originalSize_ = size || {width: 0, height: 0};

    const maxWidth = Number(responseHeaders.get('X-CreativeMaxWidth'));
    if (!isNaN(maxWidth) && maxWidth > 0) {
      this.maxWidth_ = maxWidth;
    }

    this.extractAdInfo(responseHeaders);
    return size;
  }

  /**
   * @protected
   * @param {!Headers} responseHeaders
   */
  extractAdInfo(responseHeaders) {
    this.trackerConfig_ = tryParseJson(
      responseHeaders.get('X-Runa-Tracker') || {}
    );
    if (this.trackerConfig_) {
      this.analyticsConfig_ = this.createAnalyticsConfig();
      this.extensions_./*OK*/ installExtensionForDoc(
        this.getAmpDoc(),
        'amp-analytics'
      );
    }
  }

  /**
   * @return {?JsonObject}
   */
  createAnalyticsConfig() {
    const inViewRequests = this.getURLRequestsFromTrackers('viewability');

    if (Object.keys(inViewRequests).length === 0) {
      return;
    }

    const config = {
      'transport': {'beacon': false, 'xhrpost': false, 'image': true},
      'requests': inViewRequests,
      'triggers': {},
    };
    config['triggers']['viewability'] = {
      'on': 'visible',
      'request': Object.keys(inViewRequests),
      'visibilitySpec': {
        'selector': 'amp-ad',
        'selectionMethod': 'closest',
        'visiblePercentageMin': 50,
        'continuousTimeMin': 1000,
      },
    };
    return config;
  }

  /**
   * @param {string} eventType
   * @return {Array<string>}
   */
  getURLRequestsFromTrackers(eventType) {
    const trackers = this.filterTrackersByType([eventType]);
    const requests = dict();
    for (let i = 0; i < trackers.length; i++) {
      requests[`${eventType}${i}`] = trackers[i].url || '';
    }
    return requests;
  }

  /** @override */
  viewportCallback(inViewport) {
    super.viewportCallback(inViewport);
    if (!inViewport) {
      this.attemptExpandFluidAd();
    }
  }

  /**
   * @override
   * @return {?boolean}
   */
  isValidElement() {
    if (!this.element.getAttribute('data-id')) {
      user().warn(TAG, 'RUNA ads require the attribute data-id');
      return false;
    }
    return true;
  }

  /**
   * @protected
   */
  attemptExpandFluidAd() {
    if (this.isFluidAd_ && this.originalSize_ && !this.expandedFluidAd_) {
      let size = this.originalSize_;
      if (this.isFullWidth_) {
        const viewportSize = this.getViewport().getSize();
        let rWidth = viewportSize.width;
        if (this.maxWidth_ && this.maxWidth_ < rWidth) {
          rWidth = this.maxWidth_;
        }
        const rHeight = (rWidth * size.height) / size.width;
        size = {width: rWidth, height: rHeight};
      }
      this.attemptChangeSize(size.height, size.width)
        .then(() => {
          this.expandedFluidAd_ = true;
          this.fireFluidImpression();
        })
        .catch(() => {
          this.expandedFluidAd_ = false;
        });
    }
  }

  /**
   * @protected
   * @param {Array<string>} typeList
   * @return {Array<JsonObject>}
   */
  filterTrackersByType(typeList) {
    if (this.trackerConfig_) {
      const trackers = this.trackerConfig_.trackers || [];
      return trackers.filter(e => !!e && typeList.indexOf(e.type) >= 0);
    }
    return [];
  }

  /**
   * @protected
   * @param {string} url
   */
  triggerPixel(url) {
    if (!url) {
      return;
    }
    try {
      this.win.document.body.appendChild(
        createElementWithAttributes(this.win.document, 'amp-pixel', {
          'src': url,
        })
      );
    } catch (err) {}
  }

  /**
   * @protected
   */
  fireMeasuredEvents() {
    this.filterTrackersByType(['measured']).forEach(e => {
      this.triggerPixel(e.url);
    });
  }

  /**
   * @protected
   */
  fireFluidImpression() {
    this.filterTrackersByType(['impression']).forEach(e => {
      this.triggerPixel(e.url);
    });
  }
}

AMP.extension('amp-ad-network-runa-impl', '0.1', AMP => {
  AMP.registerElement('amp-ad-network-runa-impl', AmpAdNetworkRUNAImpl);
});

