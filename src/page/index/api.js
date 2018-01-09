
import request from 'asset/common/request';

const api = {
  checkRandCode(isLogin, randCode) {
    return request({
        url: 'https://kyfw.12306.cn/otn/passcodeNew/checkRandCodeAnsyn',
        method: 'POST',
        data: {
          _json_att: '',
          rand: isLogin ? 'sjrand' : 'randp',
          randCode,
        },
      })
      .then(data => {
        if (data && data.data && data.data.result === '1') {
          return data.data;
        } else {
          return Promise.reject(data);
        }
      });
  },

  logout() {
    return request('https://kyfw.12306.cn/otn/login/loginOut');
  },

  checkUser() {
    return request({
        url: 'https://kyfw.12306.cn/otn/index/initMy12306',
        dataType: 'html',
      })
      .then(data => {
        if (data && !data.match(/var sessionInit = '([^']+)';/)) {
          return Promise.reject(data);
        }
        return data;
      });
  },

  login(user, pwd, randCode) {
    return request({
        url: 'https://kyfw.12306.cn/otn/login/loginAysnSuggest',
        method: 'POST',
        data: {
          'loginUserDTO.user_name': user,
          'userDTO.password': pwd,
          randCode,
        },
      })
      .then(data => {
        if (data && data.data && data.data.loginCheck === 'Y') {
          return data.data;
        } else {
          return Promise.reject(data);
        }
      });
  },

  getMyPassengers() {
    return request({
        url: 'https://kyfw.12306.cn/otn/confirmPassenger/getPassengerDTOs',
        method: 'POST',
        data: {
          _json_att: '',
        },
      })
      .then(data => {
        if (data && data.data && data.data.normal_passengers) {
          return data.data.normal_passengers;
        } else {
          return Promise.reject(data);
        }
      });
  },

  getQueryUrl() {
    return request({
        url: 'https://kyfw.12306.cn/otn/leftTicket/init',
        dataType: 'html'
      })
      .then(data => {
        if (data && data.match(/var CLeftTicketUrl = '([^']+)';/)) {
          return RegExp.$1;
        } else {
          return Promise.reject(data);
        }
      });
  },

  query({ queryUrl, from, to, date, isStudent }) {
    const params = [
      `leftTicketDTO.train_date=${date}`, // 2018-01-09
      `leftTicketDTO.from_station=${from}`,
      `leftTicketDTO.to_station=${to}`,
      `purpose_codes=${isStudent ? '0X00' : 'ADULT'}`,
    ].join('&');
    return request({
        url: `https://kyfw.12306.cn/otn/${queryUrl}?${params}`,
        timeout: 5000,
        headers: {
          '_$Referer': 'https://kyfw.12306.cn/otn/leftTicket/init',
        },
      })
      .then(data => {
        if (data && data.data) {
          return (data.data.result || []).map(item => {
            const fields = item.split('|');
            return {
              id: fields[0],
              button: fields[1],
              train: fields[3],
              rw: fields[23], // 软卧
              wz: fields[26], // 卧铺
              yw: fields[28], // 硬座
              yz: fields[29], // 硬座
              swz: fields[32], // 商务座
              zy: fields[31], // 一等座
              ze: fields[30], // 二等座
              fields,
            };
          });
        } else {
          if (data && data.status === false && data.c_url) {
            console.log('new addr', data);
          }
          return Promise.reject(data);
        }
      });
  },

  getQueueCount(item, seatType) {
    var trainInfo = item.queryLeftNewDTO;
    return request({
        url: 'https://kyfw.12306.cn/otn/confirmPassenger/getQueueCount',
        method: 'POST',
        data: {
          train_date: trainInfo.start_train_date,
          train_no: trainInfo.train_no,
          stationTrainCode: trainInfo.station_train_code,
          seatType: seatType,
          fromStationTelecode: trainInfo.from_station_telecode,
          toStationTelecode: trainInfo.to_station_telecode,
          leftTicket: trainInfo.yp_info,
          purpose_codes: '00',
          _json_att: '',
          REPEAT_SUBMIT_TOKEN: context.submitToken,
        },
      })
      .then(data => {
        if (data && data.data) {
          return data.data;
        } else {
          return Promise.reject(data);
        }
      });
  },

  submitOrderRequest(item, tour_flag, isStu) {
    const DATA_P = 'YYYY-MM-DD';
    return request({
        url: 'https://kyfw.12306.cn/otn/leftTicket/submitOrderRequest',
        method: 'POST',
        data: {
          secretStr: decodeURIComponent(item.secretStr),
          train_date: moment(item.queryLeftNewDTO.start_train_date, 'YYYYMMDD').format(DATA_P),
          back_train_date: moment().format(DATA_P),
          tour_flag: tour_flag,
          purpose_codes: isStu ? '0X00' : 'ADULT',
          query_from_station_name: item.queryLeftNewDTO.from_station_name,
          query_to_station_name: item.queryLeftNewDTO.to_station_name,
          myversion: 'undefined',
          'undefined': ''
        },
      }).then(data => {
        if (data && data.status && data.data === 'N') {
          return data.data;
        } else {
          return Promise.reject(data);
        }
      });
  },

  async initDc() {
    const data = await request({
      url: 'https://kyfw.12306.cn/otn/confirmPassenger/initDc',
      method: 'POST',
      data: {
        _json_att: ''
      },
      dataType: 'html'
    });
    const submitToken = data.match(/globalRepeatSubmitToken[^']*'([\w]*)'/) ? RegExp.$1 : null;
    const keyChange = data.match(/key_check_isChange':'([\w]*)'/) ? RegExp.$1 : null;

    const dynamicJs = data.match(/<script src\="\/otn\/dynamicJs\/(\w+)"/) ? RegExp.$1 : null;

    if (dynamicJs) {
      await request({
        url: `https://kyfw.12306.cn/otn/dynamicJs/${dynamicJs}`,
        dataType: 'html'
      });
    }
    return {
      submitToken,
      keyChange,
    };
  },

  checkOrderInfo(ps, oldps, tour_flag, code = '') {
    return request({
        url: 'https://kyfw.12306.cn/otn/confirmPassenger/checkOrderInfo',
        method: 'POST',
        data: {
          cancel_flag: 2,
          bed_level_order_num: '000000000000000000000000000000',
          passengerTicketStr: ps,
          oldPassengerStr: oldps,
          tour_flag: tour_flag,
          randCode: code,
          REPEAT_SUBMIT_TOKEN: context.submitToken,
          _json_att: ''
        },
      })
      .then(data => {
        if (data && data.data && data.data.submitStatus) {
          return data.data;
        } else {
          return Promise.reject(data);
        }
      });
  },

  confirmSingleForQueue(ps, oldps, code, item) {
    return request({
        url: 'https://kyfw.12306.cn/otn/confirmPassenger/confirmSingleForQueue',
        method: 'POST',
        data: {
          passengerTicketStr: ps,
          oldPassengerStr: oldps,
          randCode: code,
          REPEAT_SUBMIT_TOKEN: context.submitToken,
          key_check_isChange: context.keyChange,
          leftTicketStr: item.queryLeftNewDTO.yp_info,
          purpose_codes: '00',
          train_location: item.queryLeftNewDTO.location_code,
          _json_att: ''
        },
      })
      .then(data => {
        if (data && data.data && data.data.submitStatus) {
          return data.data;
        } else {
          return Promise.reject(data);
        }
      });
  },
};

export default api;
