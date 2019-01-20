let Service;
let Characteristic;

class Plug {
    constructor(log, config) {
        this.log = log;
        this.config = config;

        this._switch = false;
    }

    getServices() {
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
            .on('get', this.switchHandler.bind(this))
            .on('set', this.switchHandler.bind(this));

        this.informationService = informationService;
        this.switchService = switchService;

        return [informationService, switchService];
    }

    makePromise(delay, val) {
        return new Promise(resolve => {
            setTimeout(() => resolve(val), delay);
        });
    }

    async switchHandler() {
        let next;
        let state;

        // get
        if(typeof arguments[0] === 'function') {
            next = arguments[0];

            console.log('[plug] get...');

            try {
                state = await this.switch;
            } catch(e) {
                return next(e);
            }

            return next(null, state);

            // set
        } else {
            state = arguments[0];
            next = arguments[1];

            console.log('[plug] set...', state);

            try {
                await (this.switch = state);
            } catch(e) {
                return next(e);
            }

            next();
        }
    }

    get switch() {
        // return this._switch;

        return new Promise(resolve => {
            setTimeout(() => {
                console.log('[Plug] get');
                resolve(this._switch);
            }, 5000);
        });
    }

    set switch(state) {
        this._switch = state;

        return new Promise(resolve => {
            setTimeout(() => {
                console.log('[Plug] set', state);
                resolve();
            }, 5000);
        });

        // return this.makePromise(4000, undefined);
    }
}

export default function(_Service, _Characteristic) {
    Service = _Service;
    Characteristic = _Characteristic;

    return Plug;
};