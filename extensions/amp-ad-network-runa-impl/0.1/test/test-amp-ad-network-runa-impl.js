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

import {AmpAdNetworkRUNAImpl} from '../amp-ad-network-runa-impl';

describes.realWin(
  'amp-ad-network-runa-impl',
  {
    amp: {
      extensions: ['amp-ad-network-runa-impl'],
    },
  },
  env => {
    let win, doc;
    let runaImpl;
    let runaImplElem;

    beforeEach(() => {
      win = env.win;
      doc = win.document;
      runaImplElem = doc.createElement('amp-ad');
      runaImplElem.setAttribute('type', 'runa');
      sandbox
        .stub(AmpAdNetworkRUNAImpl.prototype, 'getSigningServiceNames')
        .callsFake(() => {
          return ['google'];
        });
      runaImpl = new AmpAdNetworkRUNAImpl(runaImplElem);
    });

    describe('#isValidElement', () => {
      it('should be valid', () => {
        runaImplElem.setAttribute('data-id', '748348');
        expect(runaImpl.isValidElement()).to.be.true;
      });

      it('should be invalid', () => {
        runaImplElem.setAttribute('data-id', '');
        expect(runaImpl.isValidElement()).to.be.false;
      });
    });
  }
);

