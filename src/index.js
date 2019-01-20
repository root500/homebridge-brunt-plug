// @flow

require('@babel/polyfill');

import _plug from './Plug';

let Service;
let Characteristic;

// entry point
module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    const Plug = _plug(Service, Characteristic);

    homebridge.registerAccessory('brunt-plug-plugin', 'Brunt Plug', Plug);
};

// 서비스 설정
_plug.prototype = {
    /**
     * 서비스 취득 시 설정
     * @return {*[]}
     */
    getServices: function() {
        const informationService = new Service.AccessoryInformation();
        const switchService = new Service.Switch('Plug');

        // 기기 정보 등록
        informationService
            .setCharacteristic(Characteristic.Manufacturer, 'Brunt')
            .setCharacteristic(Characteristic.Model, 'PGAKR1501')
            .setCharacteristic(Characteristic.SerialNumber, "158-001-501");

        // 스위치 서비스 등록
        switchService
            .getCharacteristic(Characteristic.On)
            .on('get', this.switch.bind(this))
            .on('set', this.switch.bind(this));

        this.informationService = informationService;
        this.switchService = switchService;

        return [informationService, switchService];
    }
};