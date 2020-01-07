var link = {};

link.productlinks ={
  cburl : 'https://domkie.com/creator/user',
  logouturl : 'https://domkie.com',
  loginurl : "https://domkie.auth.us-west-2.amazoncognito.com/login?response_type=code&client_id=3bpnd386ku67jlgbftpmo79c12&redirect_uri=https://domkie.com/creator/user"
};

link.devlinks = {
  cburl : 'http://localhost:8008/creator/user',
  logouturl : 'http://localhost:8008',
  loginurl : "https://domkie.auth.us-west-2.amazoncognito.com/login?response_type=code&client_id=3bpnd386ku67jlgbftpmo79c12&redirect_uri=http://localhost:8008/creator/user"
}

module.exports = link;