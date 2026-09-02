// Only an explicit "staging" metafield value enables stage; anything else → production.
function resolveRouteEnvironment(env) {
  return env === 'staging' ? 'staging' : 'production';
}

class RouteWidget {
  constructor(config) {
    window.isRoutePlatformUiActive = true;
    this.entrypoints = config.entrypoints || '';
    this.containerPlacement = config.containerPlacement || '';
    this.widgetType = config.widgetType || '';
    this.shopDomain = config.shopDomain || '';
    // From `$app.route_environment` (Liquid); missing/invalid → production.
    this.environment = resolveRouteEnvironment(config.environment);
    this.extensionConfigSource =
      config.extensionConfigSource === 'WCS' || config.extensionConfigSource === 'AMS'
        ? config.extensionConfigSource
        : null;
    this.init();
  }

  isStageEnvironment() {
    return this.environment === 'staging';
  }

  init() {
    this.validate();
    this.loadRouteWidget();
  }

  validate() {
    if (!this.entrypoints) {
      console.warn('Route Widget: No entrypoints provided');
      return;
    }

    try {
      const elements = document.querySelectorAll(this.entrypoints);
      if (elements.length === 0) {
        console.warn(`Route Widget: No elements found matching selector "${this.entrypoints}"`);
        return;
      }
    } catch (error) {
      console.error(`Route Widget: Invalid selector "${this.entrypoints}"`, error);
      return;
    }
  }

  loadRouteWidget() {
    const scriptUrl = this.extensionConfigSource === 'WCS'
      ? this.buildZippyScriptUrl()
      : this.buildLegacyScriptUrl();

    const script = document.createElement('script');
    script.src = scriptUrl.toString();
    script.defer = true;

    script.onerror = () => {
      console.error('Route Widget: Failed to load Route widget script');
    };

    document.head.appendChild(script);
  }

  buildLegacyScriptUrl() {
    const baseUrl = this.isStageEnvironment()
      ? 'https://shopify-widget-stage.route.com/shopify.widget.js'
      : 'https://shopify-widget.route.com/shopify.widget.js';

    const scriptUrl = new URL(baseUrl);

    scriptUrl.searchParams.set('shop', this.shopDomain);
    scriptUrl.searchParams.set('entrypoints[0].checkoutSelector',  this.entrypoints);

    if (this.containerPlacement) {
      scriptUrl.searchParams.set('entrypoints[0].widgetContainer', this.containerPlacement);
    }

    scriptUrl.searchParams.set('entrypoints[0].entrypointSelectorType', this.widgetType);
    scriptUrl.searchParams.set('app_embedded', true);

    return scriptUrl;
  }

  buildZippyScriptUrl() {
    const baseUrl = this.isStageEnvironment()
      ? 'https://widgets-cdn-stage.route.com/shopify/widget.js'
      : 'https://widgets-cdn.route.com/shopify/widget.js';

    const scriptUrl = new URL(baseUrl);
    scriptUrl.searchParams.set('shop', this.shopDomain);

    return scriptUrl;
  }
}

window.RouteWidget = RouteWidget;
