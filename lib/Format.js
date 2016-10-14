import moment from 'moment';

export function timeFormat(time){
  return moment(time).format('YYYY-MM-DD HH:mm:ss');
}
