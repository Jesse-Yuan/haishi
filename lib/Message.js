/**
 * Socket.IO统一返回的JSON格式
 */
export const SUCCESS = 1;
export const FAILUE = 0;

export default class Message {
  constructor(code, event, msg, data) {
    this.code = code;
    this.event = event;
    this.msg = msg;
    this.data = data;
  }
}
