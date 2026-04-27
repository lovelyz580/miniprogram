// pages/health/index.js
const app = getApp()
const { request } = require('../../../utils/request')
const { formatTime, calculatePetAgeFormat } = require('../../../utils/util')
const urls = require('../../../utils/api')
Page({
  data: {
    // 当前宠物
    currentPet: null,
    petList: [],
    petAge: '',
    
    // 健康概览
    lastCheckupDate: '',
    currentWeight: '--',
    weightChange: 0,
    weightChangeAbs: '0.0',
    weightChangeType: '',
    weightTrend: [],
    
    // 健康记录数量
    vaccineCount: 0,
    checkupCount: 0,
    medicationCount: 0,
    weightCount: 0,
    
    // 健康提醒
    reminders: [],
    isLoading: false
  },

  onLoad() {
    this.initPage()
  },

  onShow() {
    // this.refreshData()
  },

  onPullDownRefresh() {
    this.refreshData().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 初始化页面
  async initPage() {
    try {
			await this.getUserInfo()
      await this.getPetList()
      if (this.data.currentPet) {
        await this.getHealthOverview()
        await this.getReminders()
      }
    } catch (err) {
      console.error('初始化失败', err)
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({ isLoading: true })
    try {
			await this.getUserInfo()
      await this.getPetList()
      if (this.data.currentPet) {
        await this.getHealthOverview()
        await this.getReminders()
      }
    } catch (err) {
      console.error('刷新数据失败', err)
    } finally {
      this.setData({ isLoading: false })
    }
  },
		// 跳转登录
		goToLogin() {
			wx.navigateTo({
				url: '/pages/login/login'
			})
		},
  // 获取用户信息
  async getUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ userInfo })
    }else{
			this.goToLogin()
		}
  },
  // 获取宠物列表
  async getPetList() {
		console.log("获取宠物列表");
		if (!this.data.userInfo) {
			// 未登录在 checkLoginForAvatar 会跳转，这里直接中断即可
			return
		}
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
          wx.setStorageSync('petId', currentPet.petId)
          const petAge = calculatePetAgeFormat(currentPet.birthDate || currentPet.adoptDate)
          this.setData({ petAge })
        }
      }
    } catch (err) {
      console.error('获取宠物列表失败', err)
    }
  },

  // 获取健康概览
  async getHealthOverview() {
    const petId = this.data.currentPet.petId
    
    try {
      // 获取体重记录
      const weightRes = await request({
        url: urls.getWeightList,
        method: 'GET',
        data: { petId, page: 1, pageSize: 10 }
      })
      
      if (weightRes.code === 200) {
        const weightRecords = weightRes.data || []
        const weightTrend = weightRecords.map(r => ({
          date: r.createTime,
          weight: r.weight
        }))
        
        let currentWeight = '--'
        let weightChange = 0
        let weightChangeAbs = '0.0'
        let weightChangeType = ''
        
        if (weightRecords.length > 0) {
          currentWeight = weightRecords[0].weight
          
          if (weightRecords.length >= 2) {
            weightChange = (weightRecords[0].weight - weightRecords[1].weight).toFixed(1)
            weightChangeAbs = Math.abs(weightChange).toFixed(1)
            weightChangeType = weightChange > 0 ? 'up' : weightChange < 0 ? 'down' : ''
          }
        }
        
        this.setData({
          weightTrend,
          currentWeight,
          weightChange,
          weightChangeAbs,
          weightChangeType
        })
        
        // 绘制体重图表
        if (weightTrend.length > 0) {
          this.drawWeightChart()
        }
      }
      
      // 获取各项记录数量
      const [vaccineRes, checkupRes, medicationRes, weightCountRes] = await Promise.all([
        request({ url: urls.vaccineCount, method: 'GET', data: { petId } }),
        request({ url: urls.checkupCount, method: 'GET', data: { petId } }),
        request({ url: urls.medicationCount, method: 'GET', data: { petId } }),
        request({ url: urls.weightCount, method: 'GET', data: { petId } })
      ])
      this.setData({
        vaccineCount: vaccineRes.data || 0,
				checkupCount: checkupRes.data?.count || 0,
        medicationCount: medicationRes.data || 0,
        weightCount: weightCountRes.data || 0,
        lastCheckupDate: checkupRes.data?.lastDate || ''
      })
      
    } catch (err) {
      console.error('获取健康概览失败', err)
    }
  },

  // 获取健康提醒
  async getReminders() {
    try {
      const res = await request({
        url: urls.upcoming,
        method: 'GET',
        data: { petId: this.data.currentPet.petId, days: 3 }
      })
      
      if (res.code === 200) {
        const reminders = (res.data || []).map(item => ({
          ...item,
          typeText: this.getTypeText(item.reminderType),
          status: this.getReminderStatus(item)
        }))
        
        this.setData({ reminders })
      }
    } catch (err) {
      console.error('获取健康提醒失败', err)
    }
  },

  // 获取类型文本
  getTypeText(type) {
    const typeMap = {
      1: '疫苗',
      2: '体检',
      3: '用药',
      4: '记录提醒',
			5: '周年',
    }
    return typeMap[type] || '其他'
  },

  // 获取提醒状态
  getReminderStatus(item) {
    if (item.isCompleted) return 'done'
    const remindDate = new Date(item.remindTime)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return remindDate < today ? 'overdue' : 'pending'
  },

// 绘制体重图表
drawWeightChart() {
	const { weightTrend } = this.data
	if (weightTrend.length === 0) return

	// 传入 this 参数，适配新版小程序 API
	const ctx = wx.createCanvasContext('weightCanvas', this)
	const sysInfo = wx.getSystemInfoSync()
	const ratio = sysInfo.windowWidth / 750
	const width = (750 - 60 - 60) * ratio
	const height = 160 * ratio
	const padding = 30 * ratio

	// 计算数据范围
	const weights = weightTrend.map(t => t.weight)
	const minWeight = Math.min(...weights) - 0.5
	const maxWeight = Math.max(...weights) + 0.5
	const range = maxWeight - minWeight || 1

	// 绘制折线
	const stepX = (width - padding * 2) / (weightTrend.length - 1 || 1)

	ctx.setStrokeStyle('#FF8A65')
	ctx.setLineWidth(2 * ratio)
	ctx.beginPath()

	weightTrend.forEach((item, index) => {
		const x = padding + index * stepX
		const y = height - padding - ((item.weight - minWeight) / range) * (height - padding * 2)

		if (index === 0) {
			ctx.moveTo(x, y)
		} else {
			ctx.lineTo(x, y)
		}
	})

	ctx.stroke()

	// 绘制数据点
	ctx.setFillStyle('#FF8A65')
	weightTrend.forEach((item, index) => {
		const x = padding + index * stepX
		const y = height - padding - ((item.weight - minWeight) / range) * (height - padding * 2)
		ctx.beginPath()
		ctx.arc(x, y, 4 * ratio, 0, 2 * Math.PI)
		ctx.fill()
	})

	// 使用 draw() 方法绘制 Canvas
	ctx.draw()
},

  // 切换宠物
  switchPet() {
    const { petList } = this.data
    if (petList.length <= 1) return
    
    wx.showActionSheet({
      itemList: petList.map(p => p.name),
      success: (res) => {
        const pet = petList[res.tapIndex]
        wx.setStorageSync('petId', pet.petId)
        this.setData({ currentPet: pet })
        this.refreshData()
      }
    })
  },

  // 添加宠物
  goToAddPet() {
    wx.navigateTo({
      url: '/pages/pet/add/add'
    })
  },

  // 跳转页面
  goToVaccine() {
    wx.navigateTo({
      url: '/pages/health/vaccine/vaccine'
    })
  },

  goToCheckup() {
    wx.navigateTo({
      url: '/pages/health/checkup/checkup'
    })
  },

  goToMedication() {
    wx.navigateTo({
      url: '/pages/health/medication/medication'
    })
  },

  goToWeight() {
    wx.navigateTo({
      url: '/pages/health/weight/weight'
    })
  },

  goToReminder() {
    wx.switchTab({
      url: '/pages/reminder/index'
    })
  },

  goToAddReminder() {
    wx.navigateTo({
      url: '/pages/reminder/add'
    })
  },

  // 处理提醒点击
  handleReminder(e) {
    const { id } = e.currentTarget.dataset
    const reminder = this.data.reminders.find(r => r.reminderId === id)
    
    if (reminder) {
      wx.showModal({
        title: reminder.title,
        content: reminder.description || `提醒时间：${reminder.remindTime}`,
        confirmText: '完成',
        cancelText: '查看详情',
        success: (res) => {
          if (res.confirm) {
            this.completeReminder(id)
          }
        }
      })
    }
  },

  // 完成提醒
  async completeReminder(id) {
    try {
      const res = await request({
        url: urls.complete,
				method: 'GET',
				data: { reminderId: id }
      })
      if (res.code === 200) {
        wx.showToast({
          title: '已标记完成',
          icon: 'success'
        })
        this.refreshData()
      }
    } catch (err) {
      console.error('完成提醒失败', err)
    }
  }
})
