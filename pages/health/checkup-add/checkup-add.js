// pages/health/checkup-add/checkup-add.js
const app = getApp()
const { request } = require('../../../utils/request')
const { formatTime,UploadImages, calculatePetAgeFormat } = require('../../../utils/util')
const urls = require('../../../utils/api')
Page({
  data: {
    // 宠物信息
    currentPet: null,

    // 表单数据
    checkupType: '',
    checkupTitle: '',
    checkupDate: '',
    weight: '',
    temperature: '',
    hospital: '',
    result: '',
    attachments: [],
    note: '',

    // 体检类型选项
    checkupTypes: ['常规体检', '专项体检', '年度体检', '入学/入托体检'],

    // 提交状态
    isSubmitting: false,

    // 上传进度
    uploadProgress: 0,

    // 错误提示
    errors: {}
  },

  onLoad(options) {
    this.initPage()
  },

  onShow() {
    this.getPetInfo()
  },

  // 初始化页面
  initPage() {
    // 设置默认日期为今天
    const today = formatTime(new Date(), 'yyyy-MM-dd')
    this.setData({ checkupDate: today })
    this.getPetInfo()
  },

  // 获取宠物信息
  getPetInfo() {
    const petId = wx.getStorageSync('petId')
    const petList = wx.getStorageSync('petList') || []
    const currentPet = petList.find(p => p.petId === petId) || petList[0]
    if (currentPet) {
      this.setData({ 
        currentPet,
        weight: currentPet.weight || ''
      })
    }
  },

  // 输入处理
  onCheckupTitleInput(e) {
    this.setData({ checkupTitle: e.detail.value })
    this.clearError('checkupTitle')
  },

  onWeightInput(e) {
    this.setData({ weight: e.detail.value })
    this.clearError('weight')
  },

  onTemperatureInput(e) {
    this.setData({ temperature: e.detail.value })
    this.clearError('temperature')
  },

  onHospitalInput(e) {
    this.setData({ hospital: e.detail.value })
  },

  onResultInput(e) {
    this.setData({ result: e.detail.value })
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  // 体检类型选择
  onCheckupTypeChange(e) {
    const index = e.detail.value
    const checkupType = this.data.checkupTypes[index]
    this.setData({ checkupType })
    this.clearError('checkupType')
  },

  // 体检日期选择
  onCheckupDateChange(e) {
    this.setData({ checkupDate: e.detail.value })
    this.clearError('checkupDate')
  },

  // 清除错误
  clearError(field) {
    const errors = { ...this.data.errors }
    delete errors[field]
    this.setData({ errors })
  },

  // 表单验证
  validateForm() {
    const { checkupType, checkupTitle, checkupDate, weight, temperature } = this.data
    const errors = {}

    if (!checkupType) {
      errors.checkupType = '请选择体检类型'
    }

    if (!checkupTitle.trim()) {
      errors.checkupTitle = '请输入体检标题'
    }

    if (!checkupDate) {
      errors.checkupDate = '请选择体检日期'
    }

    // 体重验证（可选但如果有值需验证格式）
    if (weight && (isNaN(parseFloat(weight)) || parseFloat(weight) <= 0)) {
      errors.weight = '请输入有效的体重值'
    }

    // 体温验证（可选但如果有值需验证格式）
    if (temperature && (isNaN(parseFloat(temperature)) || parseFloat(temperature) < 35 || parseFloat(temperature) > 42)) {
      errors.temperature = '请输入有效的体温值（35-42℃）'
    }

    this.setData({ errors })
    return Object.keys(errors).length === 0
  },

  // 选择图片
  chooseImage() {
    wx.chooseMedia({
      count: 9 - this.data.attachments.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newFiles = res.tempFiles.map(item => ({
          url: item.tempFilePath,
          uploading: true,
          progress: 0
        }))
        this.setData({
          attachments: [...this.data.attachments, ...newFiles]
        })

      },
      fail: (err) => {
        console.error('选择图片失败', err)
        wx.showToast({
          title: '请允许访问相册/相机',
          icon: 'none'
        })
      }
    })
  },
  // 删除附件
  deleteAttachment(e) {
    const index = e.currentTarget.dataset.index
    const attachments = this.data.attachments.filter((_, i) => i !== index)
    this.setData({ attachments })
  },

  // 预览附件
  previewAttachment(e) {
    const index = e.currentTarget.dataset.index
    const urls = this.data.attachments.map(item => item.url)
    wx.previewImage({
      current: urls[index],
      urls: urls
    })
  },

  // 提交表单
  async submitForm() {
    if (this.data.isSubmitting) return

    // 表单验证
    if (!this.validateForm()) {
      wx.showToast({
        title: '请完善表单信息',
        icon: 'none'
      })
      return
    }

    const { currentPet, checkupType, checkupTitle, checkupDate, weight, temperature, hospital, result, attachments, note } = this.data

    if (!currentPet) {
      wx.showToast({
        title: '未选择宠物',
        icon: 'none'
      })
      return
    }
		let images = [];
		let mediaList= this.data.attachments
		mediaList.map(i => (
			images.push(i.url)
		))
			// 上传图片
			const imageUrls = await UploadImages({
				tempFiles: images
			});
    // 检查是否有正在上传的文件
    const uploadingFiles = attachments.filter(item => item.uploading)
    if (uploadingFiles.length > 0) {
      wx.showToast({
        title: '文件正在上传中，请稍候',
        icon: 'none'
      })
      return
    }

    this.setData({ isSubmitting: true })

    try {
      const res = await request({
        url: urls.checkupadd,
        method: 'POST',
        data: {
          petId: currentPet.petId,
          checkupType,
          checkupTitle: checkupTitle.trim(),
          checkupDate,
          weight: weight ? parseFloat(weight) : null,
          temperature: temperature ? parseFloat(temperature) : null,
          hospitalName: hospital.trim(),
          resultSummary: result.trim(),
          reportUrls: imageUrls.join(','),
          notes: note.trim()
        }
      })

      if (res.code === 200) {
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        })

        // 触发上一个页面刷新
        const pages = getCurrentPages()
        const checkupPage = pages.find(p => p.route === 'pages/health/checkup/checkup')
        if (checkupPage) {
          checkupPage.refreshData()
        }

        // 延迟返回
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: res.msg || '添加失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('添加体检记录失败', err)
      wx.showToast({
        title: '添加失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ isSubmitting: false })
    }
  },

  // 保存草稿
  saveDraft() {
    const formData = {
      checkupType: this.data.checkupType,
      checkupTitle: this.data.checkupTitle,
      checkupDate: this.data.checkupDate,
      weight: this.data.weight,
      temperature: this.data.temperature,
      hospital: this.data.hospital,
      result: this.data.result,
      note: this.data.note
    }
    wx.setStorageSync('checkupDraft', formData)
    wx.showToast({
      title: '草稿已保存',
      icon: 'success'
    })
  }
})
