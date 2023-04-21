const express = require('express');
const cors = require('cors');
const { Sequelize } = require('sequelize');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.post('/connectDB', handleConnect);
app.post('/queryDB', handleQuery);

let sequelize;

async function handleConnect(req, res) {
  // 处理接口 1 的请求
  let postConnectData = req.body;
  // console.log(req.body);
  let returnValue = await dbConnection(
    postConnectData['url'], 
    postConnectData['port'], 
    postConnectData['userName'], 
    postConnectData['passwd']
  );
  res.send(returnValue);
}

async function handleQuery(req, res) {
  // 处理接口 2 的请求
  let postConnectData = req.body;
  console.log(postConnectData);
  try {
    const [results, metadata] = await sequelize.query(postConnectData['queryData']);
    console.log('Result:', results, typeof(results));
    if (typeof(results) == 'number') {  // result of `INSERT` is a number
      res.send(String(results))
    }
    else if (typeof(results) == 'object') {
      res.send(results);
    }
  }
  catch (e) {
    console.log('Error:', e);
    res.send(e);
  }
}

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});

const dbConnection = async (host, port, user, passwd) => {
  sequelize = new Sequelize('orders', user, passwd, {
    dialect: 'mysql',
    host: host,
    port: port,
    logging: false,
  });
  
  try {
    await sequelize.authenticate();
    console.log('mysql Connection successful !!! ');
    return Promise.resolve('connected');
    } catch (error) {
    console.error('Unable to connect to the database:', error);
    return Promise.resolve(error);
  }
}