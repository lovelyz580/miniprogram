// edit.js
const app = getApp()
const { request } = require('../../../utils/request')
const { formatTime, calculatePetAge, calculatePetAgeFormat } = require('../../../utils/util')
const urls = require('../../../utils/api')
Page({
  data: {
    // 宠物ID
    petId: '',
    
    // 表单数据
    formData: {
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
    
    // 宠龄信息
    petAge: '',
    togetherDays: 0,
    
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
    
    // 是否修改了头像
    avatarChanged: false,
		canSave:false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        petId: options.id
      })
      this.loadPetData(options.id)
    }
    
    this.initBreedList()
    this.initDatePicker()
  },

  // 加载宠物数据
  async loadPetData(id) {
    try {
      wx.showLoading({ title: '加载中...' })
				const res = await request({
					url: urls.PetOne + `/${id}`,
					method: 'GET'
				})
				if (res.code === 200) {
        const pet = res.data
        const baseDate = pet.adoptDate || pet.birthDate
        this.setData({
          formData: {
						petId:pet.petId,
            name: pet.name || '',
            breed: pet.breed || '',
            gender: pet.gender || '',
            birthDate: pet.birthDate || '',
            adoptDate: pet.adoptDate || '',
            weight: pet.weight || '',
            color: pet.color || '',
            species: pet.species || 'dog',
            isNeutered: pet.isNeutered || false,
            isVaccinated: pet.isVaccinated || false,
            isDeceased: pet.isDeceased || false,
            deceasedDate: pet.deceasedDate || '',
            remark: pet.remark || '',
            avatarUrl: pet.avatarUrl || ''
          },
          petAge: calculatePetAgeFormat(baseDate),
          togetherDays: calculatePetAge(baseDate),
					canSave: true
        })
        
        // 更新品种列表
        this.updateBreedList(pet.species)
      }
      
      wx.hideLoading()
    } catch (err) {
      console.error('加载宠物数据失败', err)
      wx.hideLoading()
    }
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
    
    this.setData({
      breedList: dogBreeds
    })
  },

  // 更新品种列表
  updateBreedList(species) {
    if (species === 'dog') {
      const dogBreeds = [
        '中华田园犬', '金毛', '拉布拉多', '哈士奇', '萨摩耶', '柯基', 
        '柴犬', '边牧', '德牧', '杜宾', '吉娃娃', '泰迪/贵宾',
        '比熊', '雪纳瑞', '博美', '约克夏', '马尔济斯', '法斗',
        '巴哥', '西高地', '松狮', '藏獒', '秋田', '可卡犬',
        '腊肠犬', '贝灵顿梗', '万能梗', '澳大利亚牧羊犬', '其他'
      ]
      this.setData({ breedList: dogBreeds })
    } else if (species === 'cat') {
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

  // 初始化日期选择器
  initDatePicker() {
    const now = new Date()
    const years = []
    const months = []
    const days = []

    for (let i = now.getFullYear() - 20; i <= now.getFullYear(); i++) {
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

  // 输入处理
  onNameInput(e) {
    this.setData({
      'formData.name': e.detail.value
    })
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
    this.updateBreedList(type)
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
    })
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0]
				wx.showLoading({ title: '上传中...' })
				try {
					wx.uploadFile({
						url: urls.upload,
						filePath: tempFilePath,
						name: 'file',
						formData: {},
						header: {
							"Content-Type": "multipart/form-data"
						},
						success: (res) => {
							const res_1 = JSON.parse(res.data);
							debugger
							if (res_1.code === 200) {
								this.setData({
									'formData.avatarUrl': urls.baseUrl + res_1.data.url
								})
							}
						},
					})
          wx.hideLoading()
        } catch (err) {
          console.error('上传头像失败', err)
          // 本地预览
          this.setData({
            'formData.avatarUrl': tempFilePath
          })
          wx.hideLoading()
        }
      }
    })
  },

  // 返回
  onBack() {
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
    
    try {
      wx.showLoading({ title: '保存中...' })
      
      const res = await request({
        url: urls.editSave,
        method: 'PUT',
        data: this.data.formData
      })
      
      wx.hideLoading()
      
      if (res.code === 200) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
        
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
    } catch (err) {
      console.error('保存失败', err)
      wx.hideLoading()
    }
  },

  // 删除宠物
  onDelete() {
    wx.showModal({
      title: '确认删除',
      content: `确定要删除 ${this.data.formData.name} 吗？删除后无法恢复，所有相关记录也将被删除。`,
      confirmText: '删除',
      confirmColor: '#FF4D4F',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })
            
            const result = await request({
              url:  urls.baseUrl+`pet/${this.data.petId}`,
              method: 'DELETE'
            })
            
            wx.hideLoading()
            
            if (result.code === 0) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
              
              // 清除当前宠物缓存
              const petId = wx.getStorageSync('petId')
              if (petId === this.data.petId) {
                wx.removeStorageSync('petId')
              }
              
              setTimeout(() => {
                wx.reLaunch({
                  url: '/pages/index/index'
                })
              }, 1500)
            }
          } catch (err) {
            console.error('删除失败', err)
            wx.hideLoading()
          }
        }
      }
    })
  }
})
