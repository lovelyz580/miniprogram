// pages/profile/feedback/feedback.js
const app = getApp()
const { request } = require('../../../utils/request')
const urls = require('../../../utils/api')

Page({
  data: {
    // 表单数据
    feedbackContent: '',
    imageList: [],
    contactInfo: '',
    canSubmit: false,
    isSubmitting: false,
    maxImages: 5,
    maxContentLength: 1000
  },

  onLoad() {
    this.initPage()
  },

  // 初始化页面
  initPage() {
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.phone) {
      this.setData({
        contactInfo: userInfo.phone
      })
    }
  },

  // 输入反馈内容
  onContentInput(e) {
    const content = e.detail.value
    this.setData({
      feedbackContent: content
    })
    this.checkCanSubmit()
  },

  // 输入联系方式
  onContactInput(e) {
    const contact = e.detail.value
    this.setData({
      contactInfo: contact
    })
  },

  // 选择图片
  selectImage() {
    const maxSelectCount = this.data.maxImages - this.data.imageList.length
    if (maxSelectCount <= 0) {
      wx.showToast({
        title: `最多只能上传${this.data.maxImages}张图片`,
        icon: 'none'
      })
      return
    }

    wx.chooseImage({
      count: maxSelectCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths
        const imageList = [
          ...this.data.imageList,
          ...tempFilePaths.map(path => ({
            tempPath: path,
            uploadUrl: '',
            isUploading: true
          }))
        ]
        this.setData({
          imageList
        })
        this.uploadImages()
      },
      fail: (err) => {
        console.error('选择图片失败', err)
      }
    })
  },

  // 上传图片
  uploadImages() {
    const imageList = this.data.imageList
    const toUploadImages = imageList.filter(img => img.isUploading && !img.uploadUrl)

    if (toUploadImages.length === 0) {
      this.checkCanSubmit()
      return
    }

    wx.showLoading({ title: '上传中...' })

    let uploadedCount = 0
    toUploadImages.forEach((img, index) => {
      wx.uploadFile({
        url: urls.upload,
        filePath: img.tempPath,
        name: 'file',
        formData: {},
        header: {
          "Content-Type": "multipart/form-data"
        },
        success: (uploadRes) => {
          uploadedCount++
          try {
            const result = JSON.parse(uploadRes.data)
            if (result.code === 200) {
              // 更新图片列表
              const updatedImageList = this.data.imageList.map(item => {
                if (item.tempPath === img.tempPath) {
                  return {
                    ...item,
                    uploadUrl: urls.imgUrl + result.url,
                    isUploading: false
                  }
                }
                return item
              })
              this.setData({ imageList: updatedImageList })

              if (uploadedCount === toUploadImages.length) {
                wx.hideLoading()
                wx.showToast({
                  title: '图片上传成功',
                  icon: 'success'
                })
                this.checkCanSubmit()
              }
            } else {
              throw new Error('上传失败')
            }
          } catch (err) {
            console.error('解析上传结果失败', err)
            uploadedCount++
            if (uploadedCount === toUploadImages.length) {
              wx.hideLoading()
              wx.showToast({
                title: '部分图片上传失败',
                icon: 'none'
              })
            }
          }
        },
        fail: (err) => {
          console.error('上传图片失败', err)
          uploadedCount++
          if (uploadedCount === toUploadImages.length) {
            wx.hideLoading()
            wx.showToast({
              title: '图片上传失败',
              icon: 'none'
            })
          }
        }
      })
    })
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index
    const imageList = this.data.imageList.filter((_, i) => i !== index)
    this.setData({
      imageList
    })
    this.checkCanSubmit()
  },

  // 检查是否可以提交
  checkCanSubmit() {
    const canSubmit = this.data.feedbackContent.trim().length > 0 &&
                     !this.data.isSubmitting &&
                     this.data.imageList.every(img => !img.isUploading)
    this.setData({
      canSubmit
    })
  },

  // 提交反馈
  submitFeedback() {
    if (!this.data.canSubmit) {
      return
    }

    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    // 验证内容
    const content = this.data.feedbackContent.trim()
    if (content.length === 0) {
      wx.showToast({
        title: '反馈内容不能为空',
        icon: 'none'
      })
      return
    }

    if (content.length > this.data.maxContentLength) {
      wx.showToast({
        title: `反馈内容不能超过${this.data.maxContentLength}字`,
        icon: 'none'
      })
      return
    }

    this.setData({
      isSubmitting: true
    })

    // 构建反馈数据
    const feedbackData = {
      userId: userInfo.userId,
      content: content,
      contactInfo: this.data.contactInfo,
      images: this.data.imageList
        .filter(img => img.uploadUrl)
        .map(img => img.uploadUrl),
      createTime: new Date().toISOString()
    }

    // 调用API提交反馈
    request('POST', urls.submitFeedback, feedbackData)
      .then(res => {
        this.setData({
          isSubmitting: false
        })
        if (res.code === 200) {
          wx.showToast({
            title: '感谢您的反馈！',
            icon: 'success'
          })
          // 清空表单
          setTimeout(() => {
            this.setData({
              feedbackContent: '',
              imageList: [],
              contactInfo: userInfo.phone || ''
            })
          }, 1500)
        } else {
          wx.showToast({
            title: res.msg || '提交失败，请重试',
            icon: 'none'
          })
        }
      })
      .catch(err => {
        this.setData({
          isSubmitting: false
        })
        console.error('提交反馈失败', err)
        wx.showToast({
          title: '提交失败，请检查网络',
          icon: 'none'
        })
      })
  },

  // 预览图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index
    const imageList = this.data.imageList
    const urls = imageList.map(img => img.uploadUrl || img.tempPath)
    
    wx.previewImage({
      urls: urls,
      current: urls[index]
    })
  }
})
