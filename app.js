// app.js
const urls = require('./utils/api')

App({
  globalData: {
    baseUrl: 'https://api.zhuayin.com',
    userInfo: null,
    currentPetId: null,
    petList: null,
    currentPet: null
  },

  onLaunch() {
    this.checkLogin()
    this.getSystemInfo()
  },

  checkLogin() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    if (token && userInfo) {
      this.globalData.userInfo = userInfo
    }
  },

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

  // 获取/刷新宠物列表（带缓存）
  async refreshPetList(userId) {
    if (!userId) {
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo) return null
      userId = userInfo.userId
    }
    const { request: req } = require('./utils/request')
    try {
      const res = await req({ url: urls.PetList, method: 'GET', data: { userId } })
      if (res.code === 200) {
        const petList = res.data || []
        const petId = wx.getStorageSync('petId')
        const currentPet = petList.find(p => p.petId === petId) || petList[0]
        this.globalData.petList = petList
        this.globalData.currentPet = currentPet
        wx.setStorageSync('petList', petList)
        if (currentPet) {
          wx.setStorageSync('petId', currentPet.petId)
        }
        return { petList, currentPet }
      }
    } catch (err) {
      console.error('获取宠物列表失败', err)
    }
    return null
  },

  // 登录
  login() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: async (res) => {
          if (res.code) {
            try {
              const result = await new Promise((resv, rej) => {
                wx.request({
                  url: this.globalData.baseUrl + '/api/auth/login',
                  method: 'POST',
                  data: { code: res.code },
                  header: {
                    'Content-Type': 'application/json'
                  },
                  success: (r) => resv(r.data),
                  fail: rej
                })
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
  }
})
