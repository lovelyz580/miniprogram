// question-calendar.js
// 问答日历页面逻辑
const app = getApp()
const { request } = require('../../../utils/request')
const { formatTime,formatImgUrl } = require('../../../utils/util')
const urls = require('../../../utils/api')
Page({
  data: {
    // 星期标题
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    
    // 当前年月
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    
    // 宠物筛选
    currentPet: null,
    petList: [],
    
    // 日历数据
    calendarDays: [],
    answerDates: [], // 有回答记录的日期集合
    
    // 当月统计数据
    monthTotal: 0,
    monthAnswered: 0,
    
    // 选中日期的回答
    selectedDate: null,
    selectedAnswers: [],
    
    // 加载状态
    loading: false
  },

  onLoad(options) {
		const userInfo = wx.getStorageSync('userInfo')
		this.setData({
			userInfo
      })
    // 从URL参数获取年月（可选）
    if (options.year && options.month) {
      this.setData({
        currentYear: parseInt(options.year),
        currentMonth: parseInt(options.month)
      })
    }
    
    this.initPage()
  },

  onShow() {
    this.getMonthAnswerData()
  },

  // 初始化页面
  async initPage() {
    await this.getPetList()
    await this.getMonthAnswerData()
  },

  // 获取宠物列表
  async getPetList() {
		try {
    	let userId = this.data.userInfo.userId;
			const res = await request({
				url: urls.PetList,
				method: 'GET',
				data: {
					userId: userId
				}
			})
			if (res.code === 200) {
				const petList = res.data || []
				const petId = wx.getStorageSync('petId')
				const currentPet = petList.find(p => p.petId === petId) || petList[0]
				this.setData({
					petList,
					currentPet: currentPet || petList[0]
				})
			}
    } catch (err) {
      console.error('获取宠物列表失败', err)
    }
  },

  // 获取当月日历数据
  async getMonthAnswerData() {
    this.setData({ loading: true })
    
    try {
      const res = await request({
        url: urls.questioncalendar,
        method: 'GET',
        data: {
          petId: this.data.currentPet?.petId || '',
          year: this.data.currentYear,
          month: this.data.currentMonth
        }
      })
      if (res.code === 200) {
        const data = res.data
       
				// console.log(data.answerDates.indexOf('2026-04-15') !== -1)
				// console.log(data.answerDates.indexOf('2026-04-17') !== -1)
				// console.log(data.answerDates.indexOf('2026-04-14') !== -1)
				// console.log(data.answerDates.indexOf('2026-04-19') !== -1)
				// debugger
        // 设置有回答的日期
        this.setData({
          answerDates: data.answerDates || [],
          monthTotal: data.monthTotal || 0,
          monthAnswered: data.monthAnswered || 0,
          loading: false
        })
				 // 更新日历天数
				 this.generateCalendarDays()
      } else {
        this.setData({ loading: false })
      }
    } catch (err) {
      console.error('获取日历数据失败', err)
      this.setData({ loading: false })
    }
  },

  // 生成日历天数
  generateCalendarDays() {
    const { currentYear, currentMonth } = this.data
    
    // 获取当月第一天是星期几（0-6）
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay()
    
    // 获取当月总天数
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
    
    // 获取上个月总天数
    const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate()
    
    const calendarDays = []
    
    // 添加上个月的补齐日期
    if (firstDay > 0) {
      for (let i = firstDay - 1; i >= 0; i--) {
        calendarDays.push({
          day: daysInPrevMonth - i,
          isCurrentMonth: false,
          date: ''
        })
      }
    }
    
    // 添加当月日期
    const today = new Date()
    const todayStr = formatTime(today, 'yyyy-MM-dd')
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      
      calendarDays.push({
        day,
        isCurrentMonth: true,
        date: dateStr,
        isToday: dateStr === todayStr
      })
    }
    
    // 添加下个月的补齐日期（凑满6行）
    const remainingDays = 42 - calendarDays.length
    for (let day = 1; day <= remainingDays; day++) {
      calendarDays.push({
        day,
        isCurrentMonth: false,
        date: ''
      })
    }
    
    this.setData({ calendarDays })
  },

  // 选择宠物
  onPetChange(e) {
    const petId = e.detail.value
    const currentPet = this.data.petList.find(p => p.petId === petId)
    
    this.setData({ 
      currentPet,
      selectedDate: null,
      selectedAnswers: []
    })
    
    this.getMonthAnswerData()
  },

  // 上个月
  prevMonth() {
    let { currentYear, currentMonth } = this.data
    
    if (currentMonth === 1) {
      currentMonth = 12
      currentYear -= 1
    } else {
      currentMonth -= 1
    }
    
    this.setData({
      currentYear,
      currentMonth,
      selectedDate: null,
      selectedAnswers: []
    })
    
    this.getMonthAnswerData()
  },

  // 下个月
  nextMonth() {
    let { currentYear, currentMonth } = this.data
    
    if (currentMonth === 12) {
      currentMonth = 1
      currentYear += 1
    } else {
      currentMonth += 1
    }
    
    this.setData({
      currentYear,
      currentMonth,
      selectedDate: null,
      selectedAnswers: []
    })
    
    this.getMonthAnswerData()
  },

  // 点击日期
  async onDateTap(e) {
    const date = e.currentTarget.dataset.date
    if (!date) return
    
    // 选中效果
    this.setData({ selectedDate: date })
    
    // 获取该日期的回答
    await this.getDateAnswers(date)
  },

  // 获取指定日期的回答
  async getDateAnswers(date) {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const res = await request({
        url: urls.answerhistory,
        method: 'POST',
        data: {
          petId: this.data.currentPet?.petId || '',
          paramsBeginTime: date,
          paramsEndTime: date,
					userId: this.data.userInfo.userId,
          pageNum: 1,
          pageSize: 20
        }
      })
      
      wx.hideLoading()
      
      if (res.code === 200) {
        const answers = (res.rows || []).map(item => ({
          ...item,
          images: formatImgUrl(item.mediaUrls)
        }))
        
        this.setData({
          selectedAnswers: answers
        })
      }else{
				this.setData({
          selectedAnswers: []
        })
			}
    } catch (err) {
      console.error('获取回答失败', err)
      wx.hideLoading()
    }
  },

  // 解析媒体URL
  parseMediaUrls(mediaUrls) {
    if (!mediaUrls) return []
    try {
      return JSON.parse(mediaUrls)
    } catch (e) {
      return []
    }
  },

  // 查看回答详情
  viewAnswerDetail(e) {
    const answer = e.currentTarget.dataset.answer
    
    wx.navigateTo({
			url: `/pages/record/daily-question/daily-question?type=answer&id=${answer.answerId}`
    })
  },

  // 预览图片
  previewImage(e) {
    const images = e.currentTarget.dataset.images
    const current = e.currentTarget.dataset.current
    
    wx.previewImage({
      current,
      urls: images
    })
  },

  // 跳转到今日问答
  goToTodayQuestion() {
    wx.navigateTo({
      url: '/pages/record/daily-question/daily-question'
    })
  },

  // 跳转到历史回答
  goToHistory() {
    wx.navigateTo({
      url: '/pages/record/question-history/question-history'
    })
  }
})
