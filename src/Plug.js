import _ from 'lodash';
import to from 'await-to-js';
import deasync from 'deasync';

import Brunt from './service/Brunt';

const UPDATE_TIME = 5000;

let Service;
let Characteristic;

class Plug {
    constructor(log, config) {
        this.log = log;
        this.config = config;

        if(
            !this.config.user || typeof this.config.user !== 'string' ||
            !this.config.password || typeof this.config.password !== 'string'
        ) {
            throw new Error('Can\'t find user information.');
        }

        this.things = {};
        this.services = {};
        this.brunt = new Brunt(this.config);
        this.brunt.debug = false;
        this.isUpdate = true;
    }

    getServices() {
        console.log('[Brunt Plug] getServices');

        let services = [];
        let switches = [];
        let lock = true;

        // 기기 정보 등록
        this.infoService = new Service.AccessoryInformation();

        this.infoService
            .setCharacteristic(Characteristic.Manufacturer, 'Brunt')
            .setCharacteristic(Characteristic.Model, 'PGAKR1501')
            .setCharacteristic(Characteristic.SerialNumber, '158-001-501');

        services.push(this.infoService);

        this.getSwitches((result) => {
            switches = result;
            lock = false;
        });
        while(lock) deasync.sleep(1000);

        if(!switches.length) {
            throw new Error('There are no device on your account.');
        }

        services = services.concat(switches);

        console.log('[Brunt Plug] start checking device...');
        this.checkInterval();

        return services;
    }

    async getSwitches(callback) {
        const services = [];

        let err, things;

        [err, things] = await to(this.brunt.getThings());
        if(!things) throw err;

        console.log(`[Brunt Plug] Things - ${things.length} thing(s) found`,);

        _.forEach(things, (thing) => {
            const id = thing.SERIAL;
            const name = thing.NAME;
            const switchService = new Service.Switch(thing.NAME);
            const sensor = new Service.TemperatureSensor(thing.NAME + ' 전력');

            console.log(`\t ${id} - ${name}`);

            this.things[id] = thing;
            this.services[id] = {
                switch: switchService,
                sensor: sensor,
            };

            switchService
                .getCharacteristic(Characteristic.On)
                .on('get', async (next) => {
                    let err, state;

                    [err, state] = await to(this.getSwitch(id));
                    if(typeof state === 'undefined') {
                        next();
                        throw err;
                    }

                    next(null, state);
                })
                .on('set', async (state, next) => {
                    let err, data;

                    [err, data] = await to(this.setSwitch(id, state));
                    if(!data) {
                        next();
                        throw err;
                    }

                    next();
                });

            sensor
                .getCharacteristic(Characteristic.CurrentTemperature)
                .on('get', (next) => {
                    next(null, this.things[id].watt / 10);
                });

            services.push(switchService);
            services.push(sensor);
        });

        console.log('[Brunt Plug] things', this.things);

        callback(services);
    }

    async checkInterval() {
        setInterval(async () => {
            await this.getThings();
        }, 1000);
    }

    async getThings() {
        let err, things;

        [err, things] = await to(this.brunt.getThings());
        if(!things) throw err;

        _.forEach(things, (thing) => {
            const id = thing.SERIAL;
            const isPower = thing.power === '1';

            this.things[id] = thing;

            this.isUpdate && this.services[id].switch.updateCharacteristic(Characteristic.On, isPower);
            this.services[id].sensor.setCharacteristic(Characteristic.CurrentTemperature, thing.watt / 10 + 'W');

            if(isPower) {
                console.log(`[Brunt Plug] ${thing.NAME} (${id}) - ${thing.voltage / 10}V ${thing.ampere}A ${thing.watt / 10}W ${thing.temperature}°C`);
            }
        });

        return things;
    }

    async getSwitch(id) {
        let err, things;
        let thing = false;

        [err, things] = await to(this.brunt.getThings());
        if(!things) throw err;

        // 디바이스 찾기
        _.forEach(things, (_thing) => {
            if(_thing.SERIAL === id) {
                thing = _thing;
                return false;
            }
        });

        if(!thing) return false;

        // 디바이스 정보를 업데이트
        this.things[id] = thing;

        console.log('[Brunt Plug] getSwitch', id, thing.power === '1');

        // 현재 전원 상태를 리턴
        return thing.power === '1';
    }

    async setSwitch(id, state) {
        console.log('[Brunt Plug] setSwitch', id, state);

        const thingUri = this.things[id].thingUri;

        let err, data;

        state = (state ? 1 : 0).toString();

        [err, data] = await to(this.brunt.changeState(thingUri, state));
        if(!data) throw err;

        this.things[id].power = state;

        this.isUpdate = false;

        setTimeout(() => {
            this.isUpdate = true;
        }, UPDATE_TIME);

        return data;
    }
}

export default function(_Service, _Characteristic) {
    Service = _Service;
    Characteristic = _Characteristic;

    return Plug;
};