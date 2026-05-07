// pages/reminder/add/add.js
const app = getApp()
const {
	request
} = require('../../../utils/request')
const {
	formatTime,
	ShowImgUrl,
	calculatePetAgeFormat
} = require('../../../utils/util')
const urls = require('../../../utils/api')
Page({
  data: {
    // 表单数据
    formData: {
      title: '',
      content: '',
      category: '',
      petId: '',
      petName: '',
      remindDate: '',
      remindTime: '09:00',
      repeatType: '0'
    },
    
    // 宠物列表
    petList: [],
    petPickerValue: [0],
    
    // 日期选择器
    showDatePicker: false,
    years: [],
    months: [],
    days: [],
    datePickerValue: [0, 0, 0],
    
    // 时间选择器
    showTimePickerModal: false,
    hours: [],
    minutes: [],
    timePickerValue: [9, 0],
    
    // 宠物选择器
    showPetPickerModal: false,
    
    // 保存按钮状态
    canSave: false,
    isSaving: false
  },

  onLoad() {
		const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ userInfo })
		}
    this.initDatePicker()
    this.initTimePicker()
    this.loadPetList()
  },

  // 初始化日期选择器
  initDatePicker() {
    const now = new Date()
    const years = []
    const months = []
    const days = []

    // 生成年份：前5年到后2年
    for (let i = now.getFullYear() - 5; i <= now.getFullYear() + 2; i++) {
      years.push(i)
    }

    for (let i = 1; i <= 12; i++) {
      months.push(i)
    }

    // 每月最多31天
    for (let i = 1; i <= 31; i++) {
      days.push(i)
    }

    // 默认选中今天
    const yearIndex = years.indexOf(now.getFullYear())
    const monthIndex = now.getMonth()
    const dayIndex = now.getDate() - 1

    this.setData({
      years,
      months,
      days,
      datePickerValue: [yearIndex >= 0 ? yearIndex : 0, monthIndex, dayIndex]
    })
  },

  // 初始化时间选择器
  initTimePicker() {
    const hours = []
    const minutes = []

    for (let i = 0; i < 24; i++) {
      hours.push(i)
    }

    for (let i = 0; i < 60; i++) {
      minutes.push(i)
    }

    this.setData({
      hours,
      minutes,
      timePickerValue: [9, 0]
    })
  },

  // 加载宠物列表
  async loadPetList() {
    try {
			let userId = this.data.userInfo.userId;
      const res = await request({
				url: urls.PetList,
				method: 'GET',
				data:{
					userId:userId
				}
      })
      if (res.code === 200) {
        const petList = res.data || []
        const petId = wx.getStorageSync('petId')
        const currentPet = petList.find(p => p.petId === petId) || petList[0]
				wx.setStorageSync('petList', petList)
        this.setData({ 
          petList,
          currentPet
        })
				if (currentPet) {
					this.setData({
						'formData.petId': currentPet.petId,
						'formData.petName': currentPet.name,
						showPetPickerModal: false
					})
					this.updateCanSave()
				}
      }
    } catch (err) {
      console.error('加载宠物列表失败', err)
    }
  },

  // 输入处理
  onTitleInput(e) {
    this.setData({
      'formData.title': e.detail.value
    })
    this.updateCanSave()
  },

  onDescriptionInput(e) {
    this.setData({
      'formData.content': e.detail.value
    })
  },

  // 选择分类
  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      'formData.category': category
    })
    this.updateCanSave()
  },

  // 选择重复类型
  selectRepeatType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      'formData.repeatType': type
    })
  },

  // 日期选择器
  showDatePicker() {
    this.setData({ showDatePicker: true })
  },

  hideDatePicker() {
    this.setData({ showDatePicker: false })
  },

  onDatePickerChange(e) {
    const value = e.detail.value
    this.setData({ datePickerValue: value })
  },

  confirmDatePicker() {
    const { years, months, days, datePickerValue } = this.data
    const year = years[datePickerValue[0]]
    const month = String(months[datePickerValue[1]]).padStart(2, '0')
    const day = String(days[datePickerValue[2]]).padStart(2, '0')
    
    this.setData({
      'formData.remindDate': `${year}-${month}-${day}`,
      showDatePicker: false
    })
    this.updateCanSave()
  },

  // 时间选择器
  showTimePicker() {
    this.setData({ showTimePickerModal: true })
  },

  hideTimePicker() {
    this.setData({ showTimePickerModal: false })
  },

  onTimePickerChange(e) {
    this.setData({ timePickerValue: e.detail.value })
  },

  confirmTimePicker() {
    const { hours, minutes, timePickerValue } = this.data
    const hour = String(hours[timePickerValue[0]]).padStart(2, '0')
    const minute = String(minutes[timePickerValue[1]]).padStart(2, '0')
    
    this.setData({
      'formData.remindTime': `${hour}:${minute}`,
      showTimePickerModal: false
    })
    this.updateCanSave()
  },

  // 宠物选择器
  showPetPicker() {
    if (this.data.petList.length === 0) {
      wx.showToast({
        title: '暂无宠物，请先添加宠物',
        icon: 'none'
      })
      return
    }
    this.setData({ showPetPickerModal: true })
  },

  hidePetPicker() {
    this.setData({ showPetPickerModal: false })
  },

  onPetPickerChange(e) {
    this.setData({ petPickerValue: e.detail.value })
  },

  confirmPetPicker() {
    const { petList, petPickerValue } = this.data
    const selectedPet = petList[petPickerValue[0]]
    
    if (selectedPet) {
      this.setData({
        'formData.petId': selectedPet.petId,
        'formData.petName': selectedPet.name,
        showPetPickerModal: false
      })
      this.updateCanSave()
    } else {
      this.setData({ showPetPickerModal: false })
    }
  },

  // 阻止事件冒泡
  stopPropagation() {},

  // 更新保存按钮状态
  updateCanSave() {
    const { title, category, petId, remindDate, remindTime } = this.data.formData
    const canSave = title.trim() && category && petId && remindDate && remindTime
    this.setData({ canSave })
  },

  // 取消
  onCancel() {
    wx.navigateBack()
  },

  // 保存
  async onSave() {
    if (!this.data.canSave || this.data.isSaving) return
    
    this.setData({ isSaving: true })
    
    try {
      const { formData } = this.data
      const res = await request({
        url: urls.reminder+'/add',
        method: 'POST',
        data: {
          title: formData.title,
          content: formData.content,
          reminderType: formData.category,
          petId: formData.petId,
					userId: this.data.userInfo.userId,
          remindTime: formData.remindDate+" "+formData.remindTime,
          repeatType: formData.repeatType
        },
        showLoading: true,
        loadingText: '保存中...'
      })
      
      if (res.code === 200) {
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        })
        
        // 延迟返回列表页
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
      console.error('保存失败', err)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isSaving: false })
    }
  }
})
