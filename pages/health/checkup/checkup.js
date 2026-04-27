// pages/health/checkup.js
const app = getApp()
const { request } = require('../../../utils/request')
const { formatTime, calculatePetAgeFormat } = require('../../../utils/util')
const urls = require('../../../utils/api')
Page({
  data: {
    // 宠物信息
    currentPet: null,
    
    // 筛选
    currentTab: 'all',
    
    // 体重数据（用于图表）
    weightData: [],
    
    // 记录列表
    records: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    isLoading: false,
    isRefreshing: false
  },

  onLoad(options) {
    // 从URL参数获取筛选类型
    if (options.type) {
      this.setData({ currentTab: options.type })
    }
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
      await this.getPetInfo()
      await this.getWeightData()
      await this.getRecords()
    } catch (err) {
      console.error('初始化失败', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({ isLoading: true })
    try {
      await this.getWeightData()
      await this.getRecords(true)
    } catch (err) {
      console.error('刷新数据失败', err)
    } finally {
      this.setData({ isLoading: false })
    }
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


  // 获取体重数据（用于趋势图）
  async getWeightData() {
    const petId = this.data.currentPet.petId
    if (!petId) return
    
    try {
      const res = await request({
        url: urls.getWeightList,
        method: 'GET',
        data: { petId, page: 1, pageSize: 6 }
      })
      
      if (res.code === 200) {
        const weightData = (res.data || []).map(item => ({
          date: item.createTime,
          weight: item.weight
        }))
        
        this.setData({ weightData })
        
        // 绘制图表
        if (weightData.length > 0) {
          this.drawWeightChart()
        }
      }
    } catch (err) {
      console.error('获取体重数据失败', err)
    }
  },

  // 绘制体重图表
  drawWeightChart() {
    const { weightData } = this.data
    if (weightData.length === 0) return
    
    const ctx = wx.createCanvasContext('weightCanvas')
    const sysInfo = wx.getSystemInfoSync()
    const ratio = sysInfo.windowWidth / 750
    const width = (750 - 60 - 48) * ratio
    const height = 200 * ratio
    const padding = 40 * ratio
    
    // 计算数据范围
    const weights = weightData.map(d => d.weight)
    const minWeight = Math.min(...weights) - 0.5
    const maxWeight = Math.max(...weights) + 0.5
    const range = maxWeight - minWeight || 1
    
    // 绘制渐变背景
    ctx.setFillStyle('#FFFBF5')
    ctx.fillRect(0, 0, width, height)
    
    // 绘制折线
    const stepX = (width - padding * 2) / (weightData.length - 1 || 1)
    
    ctx.setStrokeStyle('#FF8A65')
    ctx.setLineWidth(3 * ratio)
    ctx.setLineCap('round')
    ctx.setLineJoin('round')
    ctx.beginPath()
    
    weightData.forEach((item, index) => {
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
    ctx.setFillStyle('#FFFFFF')
    ctx.setStrokeStyle('#FF8A65')
    ctx.setLineWidth(2 * ratio)
    
    weightData.forEach((item, index) => {
      const x = padding + index * stepX
      const y = height - padding - ((item.weight - minWeight) / range) * (height - padding * 2)
      
      ctx.beginPath()
      ctx.arc(x, y, 6 * ratio, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()
    })
    
    ctx.draw()
  },

  // 获取体检记录列表
  async getRecords(refresh = false) {
    const { currentPet, currentTab, page, pageSize } = this.data
    if (!currentPet) return
    
    if (refresh) {
      this.setData({ page: 1, records: [], isRefreshing: true })
    }
    
    try {
      const res = await request({
        url: urls.checkupList,
        method: 'GET',
        data: {
          petId: currentPet.petId,
          type: currentTab === 'all' ? '' : currentTab,
          page,
          pageSize
        }
      })
      
      if (res.code === 200) {
				debugger
        const records = (res.data || []).map(item => ({
          ...item,
          petAge: calculatePetAgeFormat(currentPet.birthDate || currentPet.adoptDate, item.checkupDate),
          hasAttachment: item.attachmentUrls && item.attachmentUrls.length > 0
        }))
        
        this.setData({
          records: refresh ? records : [...this.data.records, ...records],
          hasMore: records.length === pageSize,
          page: page + 1,
          isRefreshing: false
        })
      }
    } catch (err) {
      console.error('获取体检记录失败', err)
      this.setData({ isRefreshing: false })
    }
  },

  // 切换筛选tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.currentTab) return
    
    this.setData({ currentTab: tab })
    this.refreshData()
  },

  // 下拉刷新
  onRefresh() {
    this.refreshData()
  },

  // 加载更多
  loadMore() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.getRecords()
    }
  },

  // 显示记录详情
  showDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/health/checkup-detail?id=${id}`
    })
  },

  // 查看附件（体检报告）
  viewAttachment(e) {
    const { id } = e.currentTarget.dataset
    const record = this.data.records.find(r => r.id === id)
    
    if (record && record.attachmentUrls && record.attachmentUrls.length > 0) {
      wx.previewImage({
        urls: record.attachmentUrls,
        current: record.attachmentUrls[0]
      })
    }
  },

  // 跳转添加页面
  goToAdd() {
    wx.navigateTo({
      url: '/pages/health/checkup-add/checkup-add'
    })
  }
})
