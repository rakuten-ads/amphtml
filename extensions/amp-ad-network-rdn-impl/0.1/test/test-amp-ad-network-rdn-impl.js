/**
 * Copyright 2019 The AMP HTML Authors. All Rights Reserved.
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

import {AmpAdNetworkRDNImpl} from '../amp-ad-network-rdn-impl';

describes.realWin(
  'amp-ad-network-rdn-impl',
  {
    amp: {
      extensions: ['amp-ad-network-rdn-impl'],
    },
  },
  env => {
    let win, doc;
    let rdnImpl;
    let rdnImplElem;

    beforeEach(() => {
      win = env.win;
      doc = win.document;
      rdnImplElem = doc.createElement('amp-ad');
      rdnImplElem.setAttribute('type', 'rdn');
      sandbox
        .stub(AmpAdNetworkRDNImpl.prototype, 'getSigningServiceNames')
        .callsFake(() => {
          return ['google'];
        });
      rdnImpl = new AmpAdNetworkRDNImpl(rdnImplElem);
    });

    describe('#isValidElement', () => {
      it('should be valid', () => {
        rdnImplElem.setAttribute('data-id', '748348');
        expect(rdnImpl.isValidElement()).to.be.true;
      });

      it('should be invalid', () => {
        rdnImplElem.setAttribute('data-id', '');
        expect(rdnImpl.isValidElement()).to.be.false;
      });
    });
  }
);
