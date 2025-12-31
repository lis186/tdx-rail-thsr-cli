import type { Operator } from '../types/api';

/**
 * Taiwan Rail Operators Data
 * Based on TDX Rail/Operator endpoint
 */
const operators: Operator[] = [
  {
    OperatorID: 'THSR',
    OperatorCode: 'THSR',
    OperatorName: {
      Zh_tw: '台灣高鐵',
      En: 'Taiwan High Speed Rail (THSR)'
    },
    OperatorPhone: '04-36015000',
    OperatorWebsiteUrl: 'https://www.thsrc.com.tw/',
    UpdateTime: '2023-10-17T00:00:00+08:00',
    VersionID: 1
  },
  {
    OperatorID: 'TRA',
    OperatorCode: 'TRA',
    OperatorName: {
      Zh_tw: '台灣鐵路管理局',
      En: 'Taiwan Railways Administration (TRA)'
    },
    OperatorPhone: '02-23815500',
    OperatorWebsiteUrl: 'https://www.railway.gov.tw/',
    UpdateTime: '2023-10-17T00:00:00+08:00',
    VersionID: 1
  },
  {
    OperatorID: 'TRTC',
    OperatorCode: 'TRTC',
    OperatorName: {
      Zh_tw: '台北大眾捷運股份有限公司',
      En: 'Taipei Rapid Transit Corporation (TRTC)'
    },
    OperatorPhone: '02-21812345',
    OperatorWebsiteUrl: 'https://www.trtc.com.tw/',
    UpdateTime: '2023-10-17T00:00:00+08:00',
    VersionID: 1
  },
  {
    OperatorID: 'KRTC',
    OperatorCode: 'KRTC',
    OperatorName: {
      Zh_tw: '高雄捷運',
      En: 'Kaohsiung Rapid Transit Corporation (KRTC)'
    },
    OperatorPhone: '07-79195678',
    OperatorWebsiteUrl: 'https://www.krtc.com.tw/',
    UpdateTime: '2023-10-17T00:00:00+08:00',
    VersionID: 1
  },
  {
    OperatorID: 'TCLRTA',
    OperatorCode: 'TCLRTA',
    OperatorName: {
      Zh_tw: '台中市政府交通局',
      En: 'Taichung City Light Rail Transit (TCLRT)'
    },
    OperatorPhone: '04-22289111',
    OperatorWebsiteUrl: 'https://www.taichung.gov.tw/',
    UpdateTime: '2023-10-17T00:00:00+08:00',
    VersionID: 1
  }
];

export default operators;
