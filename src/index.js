require('@babel/polyfill');

import plug from './Plug';

let Service;
let Characteristic;

// entry point
module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    const Plug = plug(Service, Characteristic);

    homebridge.registerAccessory('brunt-plug-plugin', 'Brunt Plug', Plug);
};