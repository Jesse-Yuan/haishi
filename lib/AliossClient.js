import OSS from 'ali-oss';
import config from '../config';

export default new OSS.Wrapper(config.oss);
