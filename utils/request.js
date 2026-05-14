// utils/request.js

/**
 * 网络请求封装
 */

let isRedirecting = false

/**
 * 发起请求
 * @param {Object} options 请求配置
 * @param {string} options.url 请求地址
 * @param {string} options.method 请求方法
 * @param {Object} options.data 请求数据
 * @param {boolean} options.showLoading 是否显示loading
 * @param {string} options.loadingText loading文字
 * @returns {Promise} 返回Promise
 */
function request(options) {
  const {
    url,
    method = 'GET',
    data = {},
    showLoading = false,
    loadingText = '加载中...'
  } = options

  if (showLoading) {
    wx.showLoading({
      title: loadingText,
      mask: true
    })
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': wx.getStorageSync('token') || ''
      },
      success: (res) => {
        if (showLoading) {
          wx.hideLoading()
        }

        if (res.statusCode === 200) {
          if (res.data && (res.data.code === 401)) {
            if (isRedirecting) return
            isRedirecting = true
            wx.removeStorageSync('token')
            wx.removeStorageSync('userInfo')
            wx.reLaunch({
              url: '/pages/login/login',
              complete: () => { isRedirecting = false }
            })
            reject(new Error('登录已过期'))
            return
          }
          resolve(res.data)
        } else {
          wx.showToast({
            title: '网络错误',
            icon: 'none'
          })
          reject(new Error('网络错误'))
        }
      },
      fail: (err) => {
        if (showLoading) {
          wx.hideLoading()
        }
        wx.showToast({
          title: '网络连接失败',
          icon: 'none'
        })
        reject(err)
      }
    })
  })
}

/**
 * GET请求
 */
function get(url, data = {}, options = {}) {
  return request({
    url,
    method: 'GET',
    data,
    ...options
  })
}

/**
 * POST请求
 */
function post(url, data = {}, options = {}) {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  })
}

module.exports = {
  request,
  get,
  post
}
