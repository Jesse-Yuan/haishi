module.exports = {
  port: process.env.PORT || 3000,
  mongo: {
    server: process.env.MONGO_URI || 'localhost',
    dbname: process.env.DATABASE_NAME || 'test'
  },
  oss: {
    region: 'oss-cn-shenzhen',
    accessKeyId: 'LTAIzx1M7rvdWgkk',
    accessKeySecret: 'zysM8AQk3YyZJ5JoFdf9Fb647f3tta',
    bucket: 'haishi'
  },
  fileType: ['dists','imgs','logs','others'],
  admin:{
    username: 'admin',
    password: 'admin'
  }
};
