/**
 * API统一返回的JSON格式
 */
export const SUCCESS = 1;
export const FAILUE = 0;

export default class Result {
  constructor(code, msg, data) {
    this.code = code;
    this.msg = msg;
    this.data = data;
  }
}
