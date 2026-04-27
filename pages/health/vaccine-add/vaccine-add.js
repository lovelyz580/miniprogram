// pages/health/vaccine-add/vaccine-add.js
const app = getApp()
const { request } = require('../../../utils/request')
const { formatTime, calculatePetAgeFormat } = require('../../../utils/util')
const urls = require('../../../utils/api')

Page({
  data: {
    // 宠物信息
    currentPet: null,

    // 表单数据
    vaccineName: '',
    vaccineType: '',
    vaccineDate: '',
    hospital: '',
    doctor: '',
    batchNo: '',
    nextDate: '',
    notes: '',

    // 疫苗类型选项
    vaccineTypes: ['联苗', '单苗', '狂犬', '其他'],

    // 提交状态
    isSubmitting: false,

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
    this.setData({ vaccineDate: today })
    this.getPetInfo()
  },

	// 获取宠物信息
	async getPetInfo() {
		const petId = wx.getStorageSync('petId')
		const petList = wx.getStorageSync('petList') || []
		const currentPet = petList.find(p => p.petId === petId) || petList[0]

		if (currentPet) {
			this.setData({
				currentPet
			})
		}
	},

  // 输入处理
  onVaccineNameInput(e) {
    this.setData({ vaccineName: e.detail.value })
    this.clearError('vaccineName')
  },

  onHospitalInput(e) {
    this.setData({ hospital: e.detail.value })
    this.clearError('hospital')
  },

  onDoctorInput(e) {
    this.setData({ doctor: e.detail.value })
  },

  onBatchNoInput(e) {
    this.setData({ batchNo: e.detail.value })
  },

  onNoteInput(e) {
    this.setData({ notes: e.detail.value })
  },

  // 疫苗类型选择
  onVaccineTypeChange(e) {
    const index = e.detail.value
    const vaccineType = this.data.vaccineTypes[index]
    this.setData({ vaccineType })
    this.clearError('vaccineType')
  },

  // 疫苗日期选择
  onVaccineDateChange(e) {
    this.setData({ vaccineDate: e.detail.value })
    this.clearError('vaccineDate')
  },

  // 下次接种日期选择
  onNextDateChange(e) {
    this.setData({ nextDate: e.detail.value })
  },

  // 清除错误
  clearError(field) {
    const errors = { ...this.data.errors }
    delete errors[field]
    this.setData({ errors })
  },

  // 表单验证
  validateForm() {
    const { vaccineName, vaccineType, vaccineDate } = this.data
    const errors = {}

    if (!vaccineName.trim()) {
      errors.vaccineName = '请输入疫苗名称'
    }

    if (!vaccineType) {
      errors.vaccineType = '请选择疫苗类型'
    }

    if (!vaccineDate) {
      errors.vaccineDate = '请选择接种日期'
    }

    this.setData({ errors })
    return Object.keys(errors).length === 0
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

    const { currentPet, vaccineName, vaccineType, vaccineDate, hospital, doctor, batchNo, nextDate, notes } = this.data

    if (!currentPet) {
      wx.showToast({
        title: '未选择宠物',
        icon: 'none'
      })
      return
    }

    this.setData({ isSubmitting: true })

    try {
      const res = await request({
        url: urls.vaccineAdd,
        method: 'POST',
        data: {
          petId: currentPet.petId,
          vaccineName: vaccineName.trim(),
          vaccineType,
          vaccineDate,
          hospitalName: hospital.trim(),
          doctor: doctor.trim(),
          batchNo: batchNo.trim(),
          nextVaccineDate: nextDate || '',
          notes: notes.trim()
        }
      })

      if (res.code === 0) {
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        })

        // 触发上一个页面刷新
        const pages = getCurrentPages()
        const vaccinePage = pages.find(p => p.route === 'pages/health/vaccine')
        if (vaccinePage) {
          vaccinePage.refreshData()
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
      console.error('添加疫苗记录失败', err)
      wx.showToast({
        title: '添加失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ isSubmitting: false })
    }
  },

  // 保存草稿（预留）
  saveDraft() {
    const formData = {
      vaccineName: this.data.vaccineName,
      vaccineType: this.data.vaccineType,
      vaccineDate: this.data.vaccineDate,
      hospitalName: this.data.hospital,
      doctor: this.data.doctor,
      batchNo: this.data.batchNo,
      nextVaccineDate: this.data.nextDate,
      notes: this.data.notes
    }
    wx.setStorageSync('vaccineDraft', formData)
    wx.showToast({
      title: '草稿已保存',
      icon: 'success'
    })
  },

  // 加载草稿
  loadDraft() {
    const draft = wx.getStorageSync('vaccineDraft')
    if (draft) {
      this.setData(draft)
      wx.removeStorageSync('vaccineDraft')
    }
  }
})
