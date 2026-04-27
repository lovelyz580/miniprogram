// app.js
App({
  globalData: {
    // 后端接口地址
    baseUrl: 'https://api.zhuayin.com',
    // 用户信息
    userInfo: null,
    // 当前宠物ID
    currentPetId: null
  },

  onLaunch() {
    // 检查登录状态
    this.checkLogin()
    
    // 获取系统信息
    this.getSystemInfo()
  },

  // 检查登录状态
  checkLogin() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    
    if (token && userInfo) {
      this.globalData.userInfo = userInfo
    }
  },

  // 获取系统信息
  getSystemInfo() {
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res
        this.globalData.statusBarHeight = res.statusBarHeight
        this.globalData.screenWidth = res.screenWidth
        this.globalData.screenHeight = res.screenHeight
      }
    })
  },

  // 登录
  login() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: async (res) => {
          if (res.code) {
            try {
              // 发送code到后端换取token
              const result = await this.request({
                url: '/api/auth/login',
                method: 'POST',
                data: { code: res.code }
              })
              
              if (result.code === 0) {
                wx.setStorageSync('token', result.data.token)
                wx.setStorageSync('userInfo', result.data.userInfo)
                this.globalData.userInfo = result.data.userInfo
                resolve(result.data)
              } else {
                reject(new Error(result.message))
              }
            } catch (err) {
              reject(err)
            }
          } else {
            reject(new Error('登录失败'))
          }
        },
        fail: reject
      })
    })
  },

  // 获取用户信息
  getUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          resolve(res.userInfo)
        },
        fail: reject
      })
    })
  },

  // 封装请求方法
  request(options) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: this.globalData.baseUrl + options.url,
        method: options.method || 'GET',
        data: options.data || {},
        header: {
          'Content-Type': 'application/json',
          'Authorization': wx.getStorageSync('token') || ''
        },
        success: (res) => {
          resolve(res.data)
        },
        fail: reject
      })
    })
  }
})
