export default {
    customDirectEventTypes: {},
    customBubblingEventTypes: {},
    get: (name) => ({ uiViewClassName: name, validAttributes: {} }),
    register: (name, config) => config,
};
