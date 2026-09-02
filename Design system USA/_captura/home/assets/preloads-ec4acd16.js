
    (function() {
      var preconnectOrigins = ["https://cdn.shopify.com","https://extensions.shopifycdn.com"];
      var scripts = ["/cdn/shopifycloud/checkout-web/assets/c1/polyfills-legacy.uV-pN8XV.js","/cdn/shopifycloud/checkout-web/assets/c1/app-legacy.COwCpl2a.js","/cdn/shopifycloud/checkout-web/assets/c1/esnext-vendor-legacy.CerKYpGQ.js","/cdn/shopifycloud/checkout-web/assets/c1/context-browser-legacy.C9WfSha7.js","/cdn/shopifycloud/checkout-web/assets/c1/checkout-policy-legacy.D2HgKoRT.js","/cdn/shopifycloud/checkout-web/assets/c1/receipt-mapper-load-recovery-legacy.D3ZV3oph.js","/cdn/shopifycloud/checkout-web/assets/c1/receipt-eager-mappers-legacy.DKcwy5Wd.js","/cdn/shopifycloud/checkout-web/assets/c1/helpers-setAddressErrors-legacy.MhQ749Tf.js","/cdn/shopifycloud/checkout-web/assets/c1/types-ShopPayInstallments-legacy.C0mNzhNx.js","/cdn/shopifycloud/checkout-web/assets/c1/sections-shared-legacy.DsXrX1tw.js","/cdn/shopifycloud/checkout-web/assets/c1/consent-manager-shared-legacy.D4UoWp96.js","/cdn/shopifycloud/checkout-web/assets/c1/error-logger-report-graphql-error-legacy.4PQz_GIA.js","/cdn/shopifycloud/checkout-web/assets/c1/cvv-cvvBridge-legacy.D6VHWKWa.js","/cdn/shopifycloud/checkout-web/assets/c1/shop-pay-normalizeBuyerDetails-legacy.UjZYgBnR.js","/cdn/shopifycloud/checkout-web/assets/c1/utilities-shopCashMoney-legacy.h7H98hlC.js","/cdn/shopifycloud/checkout-web/assets/c1/color-contrast-colorContrast-legacy.DwNOtMKU.js","/cdn/shopifycloud/checkout-web/assets/c1/graphql-redeemable-legacy.CgxAMMu0.js","/cdn/shopifycloud/checkout-web/assets/c1/hydrate-legacy.BzuphBR0.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useShopPayExternalAppContext-legacy.BlK-HKqG.js","/cdn/shopifycloud/checkout-web/assets/c1/locale-en-legacy.B5dmqlSW.js","/cdn/shopifycloud/checkout-web/assets/c1/OnePage-legacy.kVd4NTA0.js","/cdn/shopifycloud/checkout-web/assets/c1/components-DeliveryTransition-legacy.C3YJ8kNe.js","/cdn/shopifycloud/checkout-web/assets/c1/useShopPayButtonClassName-legacy.DDPMQ0q7.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useSuppressShopPayModalOnLoad-legacy.BU4065WY.js","/cdn/shopifycloud/checkout-web/assets/c1/cross-border-hooks-legacy.D0xezY6D.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-usePickupPoints-legacy.CWAXugiJ.js","/cdn/shopifycloud/checkout-web/assets/c1/ChangeCompanyLocationLink-legacy.B9joXJ9W.js","/cdn/shopifycloud/checkout-web/assets/c1/BillingAddressForm-legacy.72RTsSUE.js","/cdn/shopifycloud/checkout-web/assets/c1/PhoneField-legacy.D0SG0MhG.js","/cdn/shopifycloud/checkout-web/assets/c1/ImpressionEventCapture-legacy.DlJ0vFBK.js","/cdn/shopifycloud/checkout-web/assets/c1/components-RedirectionNotice.module-legacy.BfLhW-uw.js","/cdn/shopifycloud/checkout-web/assets/c1/Choice-legacy.D-6ejp5p.js","/cdn/shopifycloud/checkout-web/assets/c1/Checkbox-legacy.DRKIuwu-.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useCanChangeCompanyLocation-legacy.sm_DAWti.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useForceShopPayUrl-legacy.OnoAseCg.js","/cdn/shopifycloud/checkout-web/assets/c1/CaptureEvents-ButtonWithRegisterWebPixel-legacy.Dgz3rcr8.js","/cdn/shopifycloud/checkout-web/assets/c1/ShopPayLogo-legacy.BhBzA7Fk.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useWalletsTimeout-legacy.KMP1KAW7.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-usePostPurchase-legacy.B2HMNPPn.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useWalletsMonorailTrack-legacy.C-J897Aq.js","/cdn/shopifycloud/checkout-web/assets/c1/IncentiveBadge-legacy.BhzB8sJH.js","/cdn/shopifycloud/checkout-web/assets/c1/AutocompleteField-hooks-legacy.CKBwppKT.js","/cdn/shopifycloud/checkout-web/assets/c1/PendingShipping-legacy.gpK7YFhx.js","/cdn/shopifycloud/checkout-web/assets/c1/useAddressMutationsWithNegotiation-legacy.AdOZgMWZ.js","/cdn/shopifycloud/checkout-web/assets/c1/PaymentIcon-legacy.G2rVgSP0.js","/cdn/shopifycloud/checkout-web/assets/c1/PaymentLine-legacy.DZrc4tl-.js","/cdn/shopifycloud/checkout-web/assets/c1/Theme-ThemeOverride-legacy.Ff9CHZRS.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useUpdateCheckoutAddress-legacy.B8oQxLbg.js","/cdn/shopifycloud/checkout-web/assets/c1/payment-usePaymentExemptionReason-legacy.47hXCKr-.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useShopPayProgressIntercepts-legacy.BgKVse-R.js","/cdn/shopifycloud/checkout-web/assets/c1/Section-legacy.UpMhmWi4.js","/cdn/shopifycloud/checkout-web/assets/c1/Section-SectionStyleOverride-legacy.B9yGpmJT.js","/cdn/shopifycloud/checkout-web/assets/c1/utilities-previous-legacy.bw6Idt4s.js","/cdn/shopifycloud/checkout-web/assets/c1/PaymentErrorBanner-legacy.0472Yv5G.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useGeneralPaymentErrorMessage-legacy.oaYpOUWh.js","/cdn/shopifycloud/checkout-web/assets/c1/StickyPayButton-StickyPayButton.module-legacy.ZfYwHu7F.js","/cdn/shopifycloud/checkout-web/assets/c1/PayButton-helpers-legacy.CjfuyK0B.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-payment-button-legacy.Bu2PQoS3.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-usePreselectSpi-legacy.De1a2KwQ.js","/cdn/shopifycloud/checkout-web/assets/c1/Switch-legacy.ClVBKfzR.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useAvailableShopPromotionDiscounts-legacy.DOSKg-Lp.js","/cdn/shopifycloud/checkout-web/assets/c1/checkout-as-guest-amazon-pay-legacy.B_k63HI9.js","/cdn/shopifycloud/checkout-web/assets/c1/Middot-legacy.DGOiP6Et.js","/cdn/shopifycloud/checkout-web/assets/c1/EstimatedDeliveryContent-legacy.7rC0ZcaI.js","/cdn/shopifycloud/checkout-web/assets/c1/ShippingMethodRateLabel-legacy.DgxyMN7L.js","/cdn/shopifycloud/checkout-web/assets/c1/shipping-methods-consolidated-included-legacy.DAag-BW-.js","/cdn/shopifycloud/checkout-web/assets/c1/ShippingLines-legacy.CXnOF4me.js","/cdn/shopifycloud/checkout-web/assets/c1/ShipmentBreakdown-legacy.Kh-1Li1b.js","/cdn/shopifycloud/checkout-web/assets/c1/MerchandiseModal-legacy.CbFiN97b.js","/cdn/shopifycloud/checkout-web/assets/c1/ShippingMethodSelector-legacy.LYD2YcCv.js","/cdn/shopifycloud/checkout-web/assets/c1/TextArea-legacy.3SoI4Xj8.js","/cdn/shopifycloud/checkout-web/assets/c1/SubscriptionPriceBreakdown-legacy.Bnlzv4Q7.js","/cdn/shopifycloud/checkout-web/assets/c1/hooks-useShopPayNewSignupLoginExperiment-legacy.B47ARQKJ.js","/cdn/shopifycloud/checkout-web/assets/c1/StockProblems-StockProblemsLineItemList-legacy.CvwDEOAG.js","/cdn/shopifycloud/checkout-web/assets/c1/extensibility-browser-engine-legacy.Nal4CTyi.js","/cdn/shopifycloud/checkout-web/assets/c1/utilities-extension-execution-errors-legacy.B5h7Skd1.js","/cdn/shopifycloud/checkout-web/assets/c1/performance-index-legacy.PDqIxjRH.js","/cdn/shopifycloud/checkout-web/assets/c1/extensions-rpc-legacy.CF0ki7JY.js","/cdn/shopifycloud/checkout-web/assets/c1/component-RuntimeExtension-legacy.i-yX0obV.js","/cdn/shopifycloud/checkout-web/assets/c1/AnnouncementRuntimeExtensions-legacy.BR9Fig7t.js","/cdn/shopifycloud/checkout-web/assets/c1/QRCode-legacy.BF7LVYlc.js","/cdn/shopifycloud/checkout-web/assets/c1/utilities-dates-legacy.DCA0mtXE.js","/cdn/shopifycloud/checkout-web/assets/c1/NumberField-legacy.Cg-MTeU9.js","/cdn/shopifycloud/checkout-web/assets/c1/extensions-remote-dom-legacy.4hmtDo37.js","/cdn/shopifycloud/checkout-web/assets/c1/EmailField-legacy.CwF3nU5b.js","/cdn/shopifycloud/checkout-web/assets/c1/Sheet-legacy.B-DpsFPP.js","/cdn/shopifycloud/checkout-web/assets/c1/useShopPaySessionTokenStorage-legacy.BzgKB3VW.js","/cdn/shopifycloud/checkout-web/assets/c1/extension-targets-rendering-extension-targets-legacy.CIy7-QlB.js","/cdn/shopifycloud/checkout-web/assets/c1/dist-v4-legacy.hxLzMo8h.js","/cdn/shopifycloud/checkout-web/assets/c1/ExtensionsInner-legacy.DwV3P9jk.js","/cdn/shopifycloud/checkout-web/assets/c1/adapter-host-legacy.BO6nnaXr.js","/cdn/shopifycloud/checkout-web/assets/c1/sandbox.CwYRPRdN.worker.js","/cdn/shopifycloud/checkout-web/assets/c1/sandbox-2025-07.6kKHlBw6.worker.js","https://extensions.shopifycdn.com/shopifycloud/checkout-web/assets/c1/polyfills-entry-legacy.Cd7rW3DK.worker.js"];
      var styles = [];
      var fontPreconnectUrls = ["https://fonts.shopifycdn.com"];
      var fontPrefetchUrls = ["https://fonts.shopifycdn.com/open_sans/opensans_n4.c32e4d4eca5273f6d4ee95ddf54b5bbb75fc9b61.woff2?h1=eWJlcmEudXM&hmac=54c9287ac030548eb504fafbf1be1a3d426ebbde4a437a44988009af41f4e093","https://fonts.shopifycdn.com/open_sans/opensans_n7.a9393be1574ea8606c68f4441806b2711d0d13e4.woff2?h1=eWJlcmEudXM&hmac=c925c4dc463aa7c1586c4b2a90e82b8b1ad61b0f26afaf74514cf5a20262045f"];
      var imgPrefetchUrls = ["https://cdn.shopify.com/s/files/1/0643/8590/8810/files/Union_3_x320.webp?v=1747253192"];

      function preconnect(url, callback) {
        var link = document.createElement('link');
        link.rel = 'dns-prefetch preconnect';
        link.href = url;
        link.crossOrigin = '';
        link.onload = link.onerror = callback;
        document.head.appendChild(link);
      }

      function preconnectAssets() {
        var resources = preconnectOrigins.concat(fontPreconnectUrls);
        var index = 0;
        (function next() {
          var res = resources[index++];
          if (res) preconnect(res, next);
        })();
      }

      function prefetch(url, as, callback) {
        var link = document.createElement('link');
        if (link.relList.supports('prefetch')) {
          link.rel = 'prefetch';
          link.fetchPriority = 'low';
          link.as = as;
          if (as === 'font') link.type = 'font/woff2';
          link.href = url;
          link.crossOrigin = '';
          link.onload = link.onerror = callback;
          document.head.appendChild(link);
        } else {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.onloadend = callback;
          xhr.send();
        }
      }

      function prefetchAssets() {
        var resources = [].concat(
          scripts.map(function(url) { return [url, 'script']; }),
          styles.map(function(url) { return [url, 'style']; }),
          fontPrefetchUrls.map(function(url) { return [url, 'font']; }),
          imgPrefetchUrls.map(function(url) { return [url, 'image']; })
        );
        var index = 0;
        function run() {
          var res = resources[index++];
          if (res) prefetch(res[0], res[1], next);
        }
        var next = (self.requestIdleCallback || setTimeout).bind(self, run);
        next();
      }

      function onLoaded() {
        try {
          if (parseFloat(navigator.connection.effectiveType) > 2 && !navigator.connection.saveData) {
            preconnectAssets();
            prefetchAssets();
          }
        } catch (e) {}
      }

      if (document.readyState === 'complete') {
        onLoaded();
      } else {
        addEventListener('load', onLoaded);
      }
    })();
  