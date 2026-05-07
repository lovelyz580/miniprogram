// pages/reminder/edit/edit.js
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
    // 提醒ID
    reminderId: '',
    
    // 表单数据
    formData: {
      title: '',
      content: '',
      category: '',
      petId: '',
      petName: '',
      remindDate: '',
      remindTime: '',
      repeatType: 'none'
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
    
    // 状态
    canSave: false,
    isSaving: false,
    isLoading: false
  },

  onLoad(options) {
		const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ userInfo })
		}
    const { id } = options
    if (id) {
      this.setData({ reminderId: id })
      this.initDatePicker()
      this.initTimePicker()
      this.loadDetail(id)
      this.loadPetList()
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      wx.navigateBack()
    }
  },

  // 初始化日期选择器
  initDatePicker() {
    const now = new Date()
    const years = []
    const months = []
    const days = []

    for (let i = now.getFullYear() - 5; i <= now.getFullYear() + 2; i++) {
      years.push(i)
    }

    for (let i = 1; i <= 12; i++) {
      months.push(i)
    }

    for (let i = 1; i <= 31; i++) {
      days.push(i)
    }

    this.setData({
      years,
      months,
      days
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
      minutes
    })
  },

  // 加载提醒详情
  async loadDetail(id) {
    this.setData({ isLoading: true })
    
    try {
      const res = await request({
        url: urls.reminder+`/${id}`,
        method: 'GET'
      })
      
      if (res.code === 200) {
        const detail = res.data || {}
        
        // 解析日期时间
        let datePickerValue = [0, 0, 0]
        let timePickerValue = [9, 0]
        let petPickerValue = [0]
        
        if (detail.remindDate) {
          const dateParts = detail.remindDate.split('-')
          if (dateParts.length === 3) {
            const yearIndex = this.data.years.indexOf(parseInt(dateParts[0]))
            const monthIndex = parseInt(dateParts[1]) - 1
            const dayIndex = parseInt(dateParts[2]) - 1
            datePickerValue = [
              yearIndex >= 0 ? yearIndex : 0,
              monthIndex,
              dayIndex
            ]
          }
        }
        
        if (detail.remindTime) {
          const timeParts = detail.remindTime.split(':')
          if (timeParts.length >= 2) {
            timePickerValue = [parseInt(timeParts[0]), parseInt(timeParts[1])]
          }
        }
        
        if (detail.petId && this.data.petList.length > 0) {
          const petIndex = this.data.petList.findIndex(p => p.petId === detail.petId)
          if (petIndex >= 0) {
            petPickerValue = [petIndex]
          }
        }
        
        this.setData({
          formData: {
            title: detail.title || '',
            content: detail.content || '',
            category: detail.reminderType || '',
            petId: detail.petId || '',
            petName: detail.petName || '',
            remindDate: detail.remindTime || '',
            remindTime: detail.remindTime || '09:00',
            repeatType: detail.repeatType || 'none'
          },
          datePickerValue,
          timePickerValue,
          petPickerValue
        })
        
        this.updateCanSave()
      } else {
        wx.showToast({
          title: res.msg || '加载失败',
          icon: 'none'
        })
      }
    } catch (err) {
      console.error('加载详情失败', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ isLoading: false })
    }
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
        this.setData({ petList: res.data || [] })
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
    this.setData({ datePickerValue: e.detail.value })
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
        title: '暂无宠物',
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
      const { formData, reminderId } = this.data
      const res = await request({
        url: urls.reminder+`/${reminderId}`,
        method: 'PUT',
        data: {
          reminderId: reminderId,
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
          title: '保存成功',
          icon: 'success'
        })
        
        // 延迟返回详情页
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      } else {
        wx.showToast({
          title: res.msg || '保存失败',
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
