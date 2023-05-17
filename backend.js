const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.post('/api/connectDB', handleConnect);
app.post('/api/signup', signup);
app.post('/api/login', login);
app.post('/api/changeUser', changeUser);
app.post('/api/changePasswd', changePasswd);
app.get('/api/getOrders', getOrders);
app.get('/api/menu', getMenu);
app.post('/queryDB', handleQuery);

// 自动连接数据库
let sequelize;
const dbAutoConnection = async () => {
  sequelize = new Sequelize('orders', "root", "20281128", {
    dialect: 'mysql',
    host: "172.24.65.85",
    port: 3306,
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
dbAutoConnection();

// 定义表们
const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone_number: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  passwd: {
    type: DataTypes.BLOB,
    allowNull: false,
    set: function (value) {
      // 使用 MD5 对密码进行加密，并将加密结果存储在 passwd 字段中
      let hash = crypto.createHash('md5').update(value).digest('hex');
      this.setDataValue('passwd', Buffer.from(hash, 'hex'));
    }
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isVIP: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  isAdmin: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'customer',
  timestamps: false
});
let Admin;
const Menu = sequelize.define('menu', {
  dishes: {
    type: Sequelize.STRING(255),
    allowNull: false,
    primaryKey: true,
    comment: 'Primary Key'
  },
  price: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  VIPprice: {
    type: Sequelize.INTEGER,
    allowNull: true
  },
  onSale: {
    type: Sequelize.BOOLEAN,
    allowNull: false
  }
}, {
  tableName: 'menu',
  timestamps: false,
  charset: 'latin1',
  collate: 'latin1_general_ci'
});

const Orders = sequelize.define('orders', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true,
    comment: 'Primary Key'
  },
  create_time: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Create Time'
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'customer',
      key: 'id'
    }
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  dishes: {
    type: DataTypes.STRING(255),
    allowNull: false,
    references: {
      model: 'menu',
      key: 'dishes'
    }
  },
  confirm: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0
  },
  number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'number of dishes'
  }
}, {
  tableName: 'orders',
  timestamps: false,
  engine: 'InnoDB',
  charset: 'latin1'
});

let Rider;

// 连接数据库
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

// 注册新用户
async function signup(req, res) {
  let postConnectData = req.body;
  console.log(postConnectData);
  try {
    const addUser = await Customer.create({
      nickname: `User${Math.floor(Math.random() * (10000000)) + 1}`,
      phone_number: Number.parseInt(postConnectData['phoneNumber']),
      passwd: postConnectData['passwd']
    });
    console.log("Add user id", addUser.id);
    res.send('success');
  }
  catch (e) {
    console.log(e);
    res.send(e);
  }
}

// 登录
async function login(req, res) {
  let postConnectData = req.body;
  let user = await Customer.findAll({
    where: {
      phone_number: postConnectData['phoneNumber']
      }
  });
  console.log(user)
  if (JSON.stringify(user) == '[]') {
    res.send({errorMsg: '用户未注册！'});
  }
  else {
    let userPasswd = crypto.createHash('md5').update(postConnectData['passwd']).digest('hex');
    let dbPasswd = user[0]['dataValues']['passwd'].toString('hex');
    if (userPasswd == dbPasswd) {
      res.send({
        errorMsg: 'success',
        user: user
      });
    }
    else {
      res.send({errorMsg: '密码错误！'});
    }
  }
}

// 更改用户数据
async function changeUser(req, res) {
  let postChangeData = req.body;
  console.log(postChangeData);
  try {
    let updateData = await Customer.update({ 
      phone_number: postChangeData['phoneNumber'],
      nickname: postChangeData['nickname'],
      address: postChangeData['address']
    }, // 需要修改的字段
      { where: { id: Number.parseInt(postChangeData['id']) } } // 查找条件
    );
    console.log('Sql data:', updateData);
    let user = await Customer.findAll({
      where: {
        id: postChangeData['id']
        }
    });
    res.send({message: 'success', user: user});
  }
  catch (e) {
    console.log(e);
    res.send({message: "failed"});
  }
}

// 修改密码
async function changePasswd(req, res) {
  let postChangeData = req.body;
  console.log(postChangeData);
  let olduser = await Customer.findAll({
    where: {
      id: Number.parseInt(postChangeData['id'])
      }
  })
  console.log("old user:", olduser[0]['passwd']);
  if (olduser[0]['passwd'].toString('hex') != crypto.createHash('md5').update(postChangeData['oldpasswd']).digest('hex')) {
    res.send({
      message: "error",
      data: "原密码输入错误！"
    })
  }
  else {
    try {
      let changePasswdData = await Customer.update({
        passwd: postChangeData['passwd']
      },
      {
        where: {
          id: Number.parseInt(postChangeData['id'])
        }
      });
      console.log(changePasswdData);
      res.send({message: "success"});
    }
    catch (e) {
      console.log(e);
      res.send({message: "error", data: "修改失败！"});
    }
  }
  // res.send({message: "success"});
}

// 获取订单
async function getOrders(req, res) {
  console.log(req.query);
  let orders = await Orders.findAll({
    where: {
      customerId: req.query['id']
    }
  });
  res.send(orders);
}

// 获取菜单
async function getMenu(req, res) {
  console.log(req.body);
  let _menu = await Menu.findAll({});
  res.send(_menu);
}

// 使用MySQL语言请求数据
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