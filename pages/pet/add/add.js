// add.js
const app = getApp()
const { request } = require('../../../utils/request')
const { formatTime } = require('../../../utils/util')
const urls = require('../../../utils/api')
Page({
  data: {
    // 表单数据
    formData: {
			userId:'',
      name: '',
      breed: '',
      gender: '',
      birthDate: '',
      adoptDate: '',
      weight: '',
      color: '',
      species: 'dog',
      isNeutered: false,
      isVaccinated: false,
      isDeceased: false,
      deceasedDate: '',
      remark: '',
      avatarUrl: ''
    },
    
    // 品种列表
    breedList: [],
    breedPickerValue: [0],
    customBreed: '',
    
    // 日期选择器
    showBreedPickerModal: false,
    showDatePickerModal: false,
    datePickerTitle: '选择日期',
    datePickerType: 'birthDate',
    years: [],
    months: [],
    days: [],
    datePickerValue: [0, 0, 0],
		canSave:false
  },

  onLoad() {
		this.getUserInfo()
    this.initBreedList()
    this.initDatePicker()
  },
	// 获取用户信息
	getUserInfo() {
		const userInfo = wx.getStorageSync('userInfo')
		this.setData({
			userInfo
		})
	},
  // 初始化品种列表
  initBreedList() {
    const dogBreeds = [
      '中华田园犬', '金毛', '拉布拉多', '哈士奇', '萨摩耶', '柯基', 
      '柴犬', '边牧', '德牧', '杜宾', '吉娃娃', '泰迪/贵宾',
      '比熊', '雪纳瑞', '博美', '约克夏', '马尔济斯', '法斗',
      '巴哥', '西高地', '松狮', '藏獒', '秋田', '可卡犬',
      '腊肠犬', '贝灵顿梗', '万能梗', '澳大利亚牧羊犬', '其他'
    ]
    
    const catBreeds = [
      '中华田园猫', '英短', '美短', '布偶', '暹罗', '波斯猫',
      '加菲猫', '缅因猫', '金吉拉', '苏格兰折耳猫', '俄罗斯蓝猫',
      '孟加拉豹猫', '斯芬克斯猫', '阿比西尼亚猫', '伯曼猫', '其他'
    ]
    
    this.setData({
      breedList: dogBreeds
    })
  },

  // 初始化日期选择器
  initDatePicker() {
    const now = new Date()
    const years = []
    const months = []
    const days = []

    // 年份：当前年份往前20年
    for (let i = now.getFullYear() - 20; i <= now.getFullYear(); i++) {
      years.push(i)
    }

    for (let i = 1; i <= 12; i++) {
      months.push(i)
    }

    for (let i = 1; i <= 31; i++) {
      days.push(i)
    }

    // 计算默认选中位置
    const yearIndex = years.indexOf(now.getFullYear())
    const monthIndex = months.indexOf(now.getMonth() + 1)
    const dayIndex = days.indexOf(now.getDate())

    this.setData({
      years,
      months,
      days,
      datePickerValue: [yearIndex, monthIndex, dayIndex]
    })
  },

  // 输入处理
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    }, () => {
      this.checkCanSave()
    })
  },
  
  // 检查是否可以保存
  checkCanSave() {
    const { name, breed, adoptDate } = this.data.formData
    const canSave = name.trim() && breed && adoptDate
    this.setData({ canSave })
  },

  onWeightInput(e) {
    this.setData({
      'formData.weight': e.detail.value
    })
  },

  onColorInput(e) {
    this.setData({
      'formData.color': e.detail.value
    })
  },

  onRemarkInput(e) {
    this.setData({
      'formData.remark': e.detail.value
    })
  },

  onCustomBreedInput(e) {
    this.setData({
      customBreed: e.detail.value
    })
  },

  // 选择性别
  selectGender(e) {
    const gender = e.currentTarget.dataset.gender
    this.setData({
      'formData.gender': this.data.formData.gender === gender ? '' : gender
    })
  },

  // 选择宠物类型
  selectPetType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      'formData.species': type
    })
    
    // 切换品种列表
    if (type === 'dog') {
      this.initBreedList()
    } else if (type === 'cat') {
      const catBreeds = [
        '中华田园猫', '英短', '美短', '布偶', '暹罗', '波斯猫',
        '加菲猫', '缅因猫', '金吉拉', '苏格兰折耳猫', '俄罗斯蓝猫',
        '孟加拉豹猫', '斯芬克斯猫', '阿比西尼亚猫', '伯曼猫', '其他'
      ]
      this.setData({ breedList: catBreeds })
    } else {
      this.setData({ breedList: ['狗狗', '猫猫', '兔子', '仓鼠', '龙猫', '鸟', '龟', '蛇', '其他'] })
    }
  },

  // 开关处理
  onNeuteredChange(e) {
    this.setData({
      'formData.isNeutered': e.detail.value
    })
  },

  onVaccinatedChange(e) {
    this.setData({
      'formData.isVaccinated': e.detail.value
    })
  },

  onDeceasedChange(e) {
    this.setData({
      'formData.isDeceased': e.detail.value
    })
  },

  // 品种选择
  showBreedPicker() {
    this.setData({
      showBreedPickerModal: true
    })
  },

  hideBreedPicker() {
    this.setData({
      showBreedPickerModal: false
    })
  },

  onBreedChange(e) {
    this.setData({
      breedPickerValue: e.detail.value
    })
  },

  confirmBreed() {
    const selectedBreed = this.data.breedList[this.data.breedPickerValue[0]]
    this.setData({
      'formData.breed': this.data.customBreed || selectedBreed,
      showBreedPickerModal: false,
      customBreed: ''
    }, () => {
      this.checkCanSave()
    })
  },

  // 日期选择
  showBirthdayPicker() {
    this.setData({
      showDatePickerModal: true,
      datePickerTitle: '选择生日',
      datePickerType: 'birthDate'
    })
  },

  showAdoptDatePicker() {
    this.setData({
      showDatePickerModal: true,
      datePickerTitle: '选择领养日期',
      datePickerType: 'adoptDate'
    })
  },

  showDeceasedDatePicker() {
    this.setData({
      showDatePickerModal: true,
      datePickerTitle: '选择离世日期',
      datePickerType: 'deceasedDate'
    })
  },

  hideDatePicker() {
    this.setData({
      showDatePickerModal: false
    })
  },

  onDateChange(e) {
    const value = e.detail.value
    const year = this.data.years[value[0]]
    const month = this.data.months[value[1]]
    const day = this.data.days[value[2]]
    
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    this.setData({
      [`formData.${this.data.datePickerType}`]: dateStr
    })
  },

  confirmDate() {
    this.setData({
      showDatePickerModal: false
    }, () => {
      this.checkCanSave()
    })
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        wx.showLoading({ title: '上传中...' })
        
        wx.uploadFile({
          url: urls.upload,
          filePath: tempFilePath,
          name: 'file',
          formData: {},
          header: {
            "Content-Type": "multipart/form-data"
          },
          success: (uploadRes) => {
            wx.hideLoading()
            try {
              const result = JSON.parse(uploadRes.data)
              if (result.code === 200) {
                this.setData({
                  'formData.avatarUrl': urls.imgUrl + result.url
                })
                wx.showToast({
                  title: '上传成功',
                  icon: 'success'
                })
              } else {
                throw new Error('上传失败')
              }
            } catch (err) {
              console.error('解析上传结果失败', err)
              wx.showToast({
                title: '上传失败',
                icon: 'none'
              })
            }
          },
          fail: (err) => {
            wx.hideLoading()
            console.error('上传头像失败', err)
            wx.showToast({
              title: '上传失败',
              icon: 'none'
            })
          }
        })
      }
    })
  },

  // 取消
  onCancel() {
    wx.navigateBack()
  },

  // 保存
  async onSave() {
    // 验证
    if (!this.data.formData.name.trim()) {
      wx.showToast({
        title: '请输入宠物名字',
        icon: 'none'
      })
      return
    }
    
    if (!this.data.formData.breed) {
      wx.showToast({
        title: '请选择品种',
        icon: 'none'
      })
      return
    }
    
    if (!this.data.formData.adoptDate) {
      wx.showToast({
        title: '请选择领养日期',
        icon: 'none'
      })
      return
    }
    
    this.data.formData.userId = this.data.userInfo.userId
    
    try {
      wx.showLoading({ title: '保存中...' })
      
      const res = await request({
        url: urls.addPet,
        method: 'POST',
        data: this.data.formData
      })
      
      wx.hideLoading()
      
      if (res.code === 200 ) {
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        })
        
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
      wx.hideLoading()
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      })
    }
  }
})
