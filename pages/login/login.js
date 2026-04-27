// login.js
const app = getApp()
const { request } = require('../../utils/request')
const urls  = require('../../utils/api')
Page({
  data: {
    // 协议同意状态
    isAgree: false,
    
    // 登录状态
    isLogging: false,
    
    // 弹窗控制
    showUserAgreement: false,
    showPrivacyPolicy: false
  },

  onLoad() {
    // 检查登录状态
    this.checkLoginStatus()
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    
    if (token && userInfo) {
      // 已登录，跳转到首页
      wx.reLaunch({
        url: '/pages/index/index'
      })
    }
  },

  // 切换协议同意状态
  toggleAgreement() {
    this.setData({
      isAgree: !this.data.isAgree
    })
  },

  // 显示用户协议
  showUserAgreement() {
    this.setData({
      showUserAgreement: true
    })
  },

  hideUserAgreement() {
    this.setData({
      showUserAgreement: false
    })
  },

  // 显示隐私政策
  showPrivacyPolicy() {
    this.setData({
      showPrivacyPolicy: true
    })
  },

  hidePrivacyPolicy() {
    this.setData({
      showPrivacyPolicy: false
    })
  },

  // 微信登录
  onLogin() {
    if (!this.data.isAgree || this.data.isLogging) return
    
    this.setData({
      isLogging: true
    })

    // 调用微信登录
    wx.login({
      success: (loginRes) => {
        if (loginRes.code) {
          // 发送 code 到后端获取 token
          this.loginByWechat(loginRes.code)
        } else {
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none'
          })
          this.setData({
            isLogging: false
          })
        }
      },
      fail: (err) => {
        console.error('微信登录失败', err)
        wx.showToast({
          title: '登录失败，请检查网络',
          icon: 'none'
        })
        this.setData({
          isLogging: false
        })
      }
    })
  },

  // 后端登录验证
  async loginByWechat(code) {
    try {
      const res = await request({
        url: urls.loginByWechat,
        method: 'POST',
        data: { code }
      })
      debugger
      if (res.code === 200) {
        // 保存 token 和用户信息
        // wx.setStorageSync('token', res.data.token)
        wx.setStorageSync('userInfo', res.data)
        
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
        
        // 跳转到首页
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/index/index'
          })
        }, 1500)
      } else {
        wx.showToast({
          title: res.message || '登录失败',
          icon: 'none'
        })
        this.setData({
          isLogging: false
        })
      }
    } catch (err) {
      console.error('登录请求失败', err)
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      })
      this.setData({
        isLogging: false
      })
    }
  },

  // 手机号登录
  onPhoneLogin() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 游客访问
  onVisitorAccess() {
    wx.showModal({
      title: '温馨提示',
      content: '游客模式下部分功能将受到限制，是否继续？',
      success: (res) => {
        if (res.confirm) {
          // 设置游客模式标记
          wx.setStorageSync('isVisitor', true)
          
          // 跳转到首页
          wx.reLaunch({
            url: '/pages/index/index'
          })
        }
      }
    })
  }
})
