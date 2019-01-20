import axios from 'axios';
import cookie from 'cookie';
import to from 'await-to-js';

const SKY = 'https://sky.brunt.co:443/';
const THING = 'https://thing.brunt.co:8080/';

class Brunt {
    constructor(config) {
        this.config = config;
    }

    request(config) {
        const headers = {};

        let dataStr;

        // header 정보 추가
        if(config.data) {
            dataStr = JSON.stringify(config.data);

            headers['Content-Length'] = Buffer.byteLength(dataStr);
            headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
            headers['Origin'] = 'https://sky.brunt.co';
            // headers['Accept-Language'] = 'ko-kr';
            headers['Accept'] = 'application/vnd.brunt.v1+json';
            headers['User-Agent'] = 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E216';
        }

        // sessionId 존재 시 설정
        if(this.sessionId) {
            headers['Cookie'] = 'skySSEIONID=' + this.sessionId;
        }

        // axios 인스턴스 만들기
        let req = axios.create({
            method: config.method,

            baseURL: config.baseURL,
            url: config.url,
            data: config.data,

            timeout: 3000,
            headers: headers,
        });

        return req.request(config)
            .then((res) => {
                if(typeof res.headers['set-cookie'] !== 'undefined') {
                    this.setSessionId(res.headers['set-cookie'][0]);
                }

                this.debug && console.log('[Brunt API] res data: ', res.data);

                return res.data;
            })
            .catch((error) => {
                this.debug && console.log('[Brunt API] error res data: ', error.response.data);

                throw error;
            });
    }

    /**
     * 세션 설정
     * @param {string} str - 쿠키 문자열
     */
    setSessionId(str: string) {
        const cookies = cookie.parse(str);

        this.sessionId = cookies.skySSEIONID;
        console.log("[Brunt API] Session ID: ", this.sessionId);
    }

    /**
     * 로그인
     * @param {string} user - 계정
     * @param {string} password - 비밀번호
     * @return {Promise<*>}
     */
    async login(user, password) {
        let err, data;

        [err, data] = await to(this.request({
            method: 'post',
            baseURL: SKY,
            url: '/session',

            data: {
                "ID": user,
                "PASS": password,
            }
        })); if(!data) throw err;

        // 계정 활성화 검사
        if(typeof data.status !== 'string' || data.status !== 'activate') {
            throw new Error('the account not activated.')
        }

        return data;
    }

    async getThings() {
        let err, user, data;

        // 로그인 처리
        if(!this.sessionId) {
            [err, user] = await to(this.login(this.config.user, this.config.password));
            if(!user) throw err;

            console.log(`[Brunt Plug] Hello ${user.nickname}! ${this.config.user} is logged.`);
        }

        [err, data] = await to(this.request({
            method: 'get',
            baseURL: SKY,
            url: '/thing',
        })); if(!data) throw err;

        return data;
    }

    async changeState(thingUri, state) {
        let err, data;

        // 로그인 처리
        if(!this.sessionId) {
            let err, user;

            [err, user] = await to(this.login(this.config.user, this.config.password));
            if(!user) throw err;

            console.log(`[Brunt Plug] Hello ${user.nickname}! ${this.config.user} is logged.`);
        }

        [err, data] = await to(this.request({
            method: 'put',
            baseURL: THING,
            url: '/thing' + thingUri,

            data: {
                power: state,
            },
        })); if(typeof data !== 'string') throw err;

        return true;
    }
}

export default Brunt;