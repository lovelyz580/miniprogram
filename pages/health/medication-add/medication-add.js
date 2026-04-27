// pages/health/medication-add/medication-add.js
const app = getApp()
const { request } = require('../../../utils/request')
const { formatTime, calculatePetAgeFormat } = require('../../../utils/util')
const urls = require('../../../utils/api')
Page({
  data: {
    // 宠物信息
    currentPet: null,

    // 表单数据
    medicationName: '',
    medicationType: '',
    startDate: '',
    endDate: '',
    dosage: '',
    frequency: '',
    hospital: '',
    notes: '',

    // 是否启用提醒
    enableReminder: false,
    reminderTime: '09:00',
    reminderDays: [true, true, true, true, true, true, true], // 周一到周日

    // 用药类型选项
    medicationTypes: ['内服', '外用', '注射', '滴耳', '滴眼', '喷雾', '其他'],

    // 用药频次选项
    frequencyOptions: ['每日1次', '每日2次', '每日3次', '每周1次', '每周2次', '每周3次', '按需'],

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
    this.setData({ startDate: today })
    this.getPetInfo()
  },

   // 获取宠物信息
	 async getPetInfo() {
    const petId = wx.getStorageSync('petId')
    const petList = wx.getStorageSync('petList') || []
    const currentPet = petList.find(p => p.petId === petId) || petList[0]
    
    if (currentPet) {
      this.setData({ currentPet })
    }
  },

  // 输入处理
  onMedicationNameInput(e) {
    this.setData({ medicationName: e.detail.value })
    this.clearError('medicationName')
  },

  onDosageInput(e) {
    this.setData({ dosage: e.detail.value })
  },

  onFrequencyChange(e) {
    const index = e.detail.value
    const frequency = this.data.frequencyOptions[index]
    this.setData({ frequency })
  },

  onHospitalInput(e) {
    this.setData({ hospital: e.detail.value })
  },

  onNoteInput(e) {
    this.setData({ notes: e.detail.value })
  },

  // 用药类型选择
  onMedicationTypeChange(e) {
    const index = e.detail.value
    const medicationType = this.data.medicationTypes[index]
    this.setData({ medicationType })
    this.clearError('medicationType')
  },

  // 开始日期选择
  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value })
    this.clearError('startDate')
  },

  // 结束日期选择
  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value })
  },

  // 切换提醒开关
  onReminderToggle(e) {
    this.setData({ enableReminder: e.detail.value })
  },

  // 提醒时间选择
  onReminderTimeChange(e) {
    this.setData({ reminderTime: e.detail.value })
  },

  // 选择提醒日期
  toggleReminderDay(e) {
    const index = e.currentTarget.dataset.index
    const reminderDays = [...this.data.reminderDays]
    reminderDays[index] = !reminderDays[index]
    this.setData({ reminderDays })
  },

  // 清除错误
  clearError(field) {
    const errors = { ...this.data.errors }
    delete errors[field]
    this.setData({ errors })
  },

  // 表单验证
  validateForm() {
    const { medicationName, medicationType, startDate, frequency } = this.data
    const errors = {}

    if (!medicationName.trim()) {
      errors.medicationName = '请输入药品名称'
    }

    if (!medicationType) {
      errors.medicationType = '请选择用药类型'
    }

    if (!startDate) {
      errors.startDate = '请选择开始日期'
    }

    if (!frequency) {
      errors.frequency = '请选择用药频次'
    }

    // 结束日期不能早于开始日期
    if (this.data.endDate && this.data.endDate < this.data.startDate) {
      errors.endDate = '结束日期不能早于开始日期'
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

    const { currentPet, medicationName, medicationType, startDate, endDate, dosage, frequency, hospital, notes, enableReminder, reminderTime, reminderDays } = this.data

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
        url: urls.Medication+'/add',
        method: 'POST',
        data: {
          petId: currentPet.petId,
          medicationName: medicationName.trim(),
          medicationType,
          startDate,
          endDate: endDate || '',
          dosage: dosage.trim(),
          frequency,
          reason: hospital.trim(),
          notes: notes.trim()
        }
      })

      if (res.code === 200) {
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        })
				debugger
        // 如果启用了提醒，创建提醒
        if (enableReminder && res.data?.recordId) {
          await this.createReminder(res.data.recordId, medicationName, startDate, endDate, reminderTime, reminderDays)
        }

        // 触发上一个页面刷新
        const pages = getCurrentPages()
        const medicationPage = pages.find(p => p.route === 'pages/health/medication')
        if (medicationPage) {
          medicationPage.refreshData()
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
      console.error('添加用药记录失败', err)
      wx.showToast({
        title: '添加失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ isSubmitting: false })
    }
  },

  // 创建用药提醒
  async createReminder(recordId, medicationName, startDate, endDate, reminderTime, reminderDays) {
    // 获取选中的提醒日期
    const weekdays = []
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    reminderDays.forEach((selected, index) => {
      if (selected) {
        weekdays.push(dayNames[index])
      }
    })

    if (weekdays.length === 0) return

    try {
      await request({
        url: urls.Reminder+'/add',
        method: 'POST',
        data: {
          petId: this.data.currentPet.petId,
					userId:this.data.currentPet.userId,
          reminderType: 3,
          relatedId: recordId,
          title: `用药提醒：${medicationName}`,
          content: `请按时给${this.data.currentPet.name}服用${medicationName}`,
          startDate,
          endDate: endDate || '',
          remindTime: reminderTime,
          weekdays:weekdays.join(','),
          enabled: true
        }
      })

      wx.showToast({
        title: '提醒已设置',
        icon: 'success'
      })
    } catch (err) {
      console.error('创建提醒失败', err)
    }
  },

  // 保存草稿
  saveDraft() {
    const formData = {
      medicationName: this.data.medicationName,
      medicationType: this.data.medicationType,
      startDate: this.data.startDate,
      endDate: this.data.endDate,
      dosage: this.data.dosage,
      frequency: this.data.frequency,
      hospital: this.data.hospital,
      notes: this.data.notes,
      enableReminder: this.data.enableReminder,
      reminderTime: this.data.reminderTime,
      reminderDays: this.data.reminderDays
    }
    wx.setStorageSync('medicationDraft', formData)
    wx.showToast({
      title: '草稿已保存',
      icon: 'success'
    })
  }
})
