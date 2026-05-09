// pages/health/weight.js
const app = getApp()
const { request } = require('../../../utils/request')
const { formatTime, calculatePetAgeFormat } = require('../../../utils/util')
const urls = require('../../../utils/api')
Page({
  data: {
    // 宠物信息
    currentPet: null,
    
    // 当前体重信息
    currentWeight: '--',
    recordDate: '--',
    changeValue: '0.0',
    changeType: '',
    
    // 健康体重范围
    minHealthyWeight: 0,
    maxHealthyWeight: 0,
    isHealthy: true,
    isTooLight: false,
    rangePosition: 50,
    
    // 时间范围
    timeRange: 'month',
    
    // 趋势统计数据
    avgWeight: '--',
    maxWeight: '--',
    minWeight: '--',
    trendData: [],
    
    // 记录列表
    records: [],
    totalCount: 0,
    page: 1,
    pageSize: 20,
    hasMore: false,
    isLoading: false,
    
    // 弹窗控制
    showModal: false,
    editingId: null,
    inputWeight: '',
    inputDate: '',
    inputNote: ''
  },

  onLoad() {
    this.initPage()
  },

  onShow() {
    this.refreshData()
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
      await this.getTrendData()
      await this.getRecords(true)
    } catch (err) {
      console.error('初始化失败', err)
    }
  },

  // 刷新数据
  async refreshData() {
    this.setData({ isLoading: true })
    try {
      await this.getWeightData()
      await this.getTrendData()
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

  // 获取体重数据
  async getWeightData() {
    const petId = this.data.currentPet.petId
    if (!petId) return
  
    try {
      const res = await request({
        url: urls.latestWeight,
        method: 'GET',
        data: { petId }
      })
      
      if (res.code === 200 && res.data) {
        const current = res.data.current
        const previous = res.data.previous
      
        let changeValue = '0.0'
        let changeType = ''
        
        if (previous) {
          const diff = current.weight - previous.weight
          changeValue = Math.abs(diff).toFixed(1)
          changeType = diff > 0 ? 'up' : diff < 0 ? 'down' : ''
        }
        
        // 计算健康体重范围（根据宠物类型和品种简化计算）
        const { minHealthyWeight, maxHealthyWeight, isHealthy, isTooLight, rangePosition } = 
          this.calculateHealthyRange(current.weight, this.data.currentPet)
        
        this.setData({
          currentWeight: current.weight,
          recordDate: current.recordDate,
          changeValue,
          changeType,
          minHealthyWeight,
          maxHealthyWeight,
          isHealthy,
          isTooLight,
          rangePosition
        })
      }
    } catch (err) {
      console.error('获取体重数据失败', err)
    }
  },

  // 计算健康体重范围
  calculateHealthyRange(weight, pet) {
    // 简化计算，实际应该根据品种和体型计算
    const minWeight = pet.minWeight || weight * 0.85
    const maxWeight = pet.maxWeight || weight * 1.15
    
    const isHealthy = weight >= minWeight && weight <= maxWeight
    const isTooLight = weight < minWeight
    
    // 计算指示器位置（0-100）
    const range = maxWeight - minWeight
    const rangePosition = range > 0 ? ((weight - minWeight) / range) * 100 : 50
    
    return {
      minHealthyWeight: minWeight.toFixed(1),
      maxHealthyWeight: maxWeight.toFixed(1),
      isHealthy,
      isTooLight,
      rangePosition: Math.min(100, Math.max(0, rangePosition))
    }
  },

  // 获取趋势数据
  async getTrendData() {
    const petId = this.data.currentPet.petId
    const { timeRange } = this.data
    if (!petId) return
    
    // 计算时间范围
    let startDate = ''
    const today = new Date()
    switch (timeRange) {
      case 'week':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        break
      case 'month':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        break
      case 'year':
        startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        break
    }
    
    try {
      const res = await request({
        url: urls.Weight+'/trend',
        method: 'GET',
        data: { petId, startDate }
      })
      
      if (res.code === 200) {
        const trendData = res.data || []
        const weights = trendData.map(d => d.weight)
        
        this.setData({
          trendData,
          avgWeight: weights.length > 0 ? (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1) : '--',
          maxWeight: weights.length > 0 ? Math.max(...weights).toFixed(1) : '--',
          minWeight: weights.length > 0 ? Math.min(...weights).toFixed(1) : '--'
        })
        
        // 绘制趋势图
        if (trendData.length > 0) {
          this.drawTrendChart()
        }
      }
    } catch (err) {
      console.error('获取趋势数据失败', err)
    }
  },

  // 绘制趋势图
  drawTrendChart() {
    const { trendData } = this.data
    if (trendData.length === 0) return
    
    const ctx = wx.createCanvasContext('trendCanvas')
    const sysInfo = wx.getSystemInfoSync()
    const ratio = sysInfo.windowWidth / 750
    const width = (750 - 60 - 48) * ratio
    const height = 220 * ratio
    const padding = 50 * ratio
    
    // 计算数据范围
    const weights = trendData.map(d => d.weight)
    const minWeight = Math.min(...weights) - 1
    const maxWeight = Math.max(...weights) + 1
    const range = maxWeight - minWeight || 1
    
    // 绘制网格线
    ctx.setStrokeStyle('#F0F0F0')
    ctx.setLineWidth(1)
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i / 4) * (height - padding * 2)
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }
    
    // 绘制渐变区域
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding)
    gradient.addColorStop(0, 'rgba(255, 138, 101, 0.3)')
    gradient.addColorStop(1, 'rgba(255, 138, 101, 0.05)')
    
    ctx.setFillStyle(gradient)
    ctx.beginPath()
    ctx.moveTo(padding, height - padding)
    
    trendData.forEach((item, index) => {
      const x = padding + (index / (trendData.length - 1 || 1)) * (width - padding * 2)
      const y = height - padding - ((item.weight - minWeight) / range) * (height - padding * 2)
      ctx.lineTo(x, y)
    })
    
    ctx.lineTo(padding + (width - padding * 2), height - padding)
    ctx.closePath()
    ctx.fill()
    
    // 绘制折线
    ctx.setStrokeStyle('#FF8A65')
    ctx.setLineWidth(3 * ratio)
    ctx.setLineCap('round')
    ctx.setLineJoin('round')
    ctx.beginPath()
    
    trendData.forEach((item, index) => {
      const x = padding + (index / (trendData.length - 1 || 1)) * (width - padding * 2)
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
    trendData.forEach((item, index) => {
      const x = padding + (index / (trendData.length - 1 || 1)) * (width - padding * 2)
      const y = height - padding - ((item.weight - minWeight) / range) * (height - padding * 2)
      
      ctx.beginPath()
      ctx.arc(x, y, 5 * ratio, 0, 2 * Math.PI)
      ctx.fill()
    })
    
    ctx.draw()
  },

  // 获取记录列表
  async getRecords(refresh = false) {
    const { currentPet, page, pageSize } = this.data
    if (!currentPet) return
    
    if (refresh) {
      this.setData({ page: 1, records: [], isLoading: true })
    }
    
    try {
      const res = await request({
        url: urls.getWeightList,
        method: 'POST',
        data: {
          petId: currentPet.petId,
          page,
          pageSize
        }
      })
      
      if (res.code === 200) {
        const records = (res.rows || []).map(item => {
          const date = new Date(item.createTime)
          return {
            ...item,
            day: date.getDate(),
            month: `${date.getMonth() + 1}月`,
            healthStatus: this.getHealthStatus(item.weight)
          }
        })
        
        this.setData({
          records: refresh ? records : [...this.data.records, ...records],
          totalCount: res.total || 0,
          hasMore: records.length === pageSize,
          page: page + 1,
          isLoading: false
        })
      }
    } catch (err) {
      console.error('获取记录列表失败', err)
      this.setData({ isLoading: false })
    }
  },

  // 获取健康状态
  getHealthStatus(weight) {
    const { minHealthyWeight, maxHealthyWeight } = this.data
    if (weight < minHealthyWeight) return '偏瘦'
    if (weight > maxHealthyWeight) return '偏胖'
    return '正常'
  },

  // 切换时间范围
  changeTimeRange(e) {
    const range = e.currentTarget.dataset.range
    if (range === this.data.timeRange) return
    
    this.setData({ timeRange: range })
    this.getTrendData()
  },

  // 显示添加弹窗
  showAddModal() {
    this.setData({
      showModal: true,
      editingId: null,
      inputWeight: '',
      inputDate: formatTime(new Date(), 'yyyy-MM-dd'),
      inputNote: ''
    })
  },

  // 隐藏弹窗
  hideModal() {
    this.setData({ showModal: false })
  },

  // 阻止冒泡
  preventBubble() {},

  // 输入处理
  onWeightInput(e) {
    this.setData({ inputWeight: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ inputDate: e.detail.value })
  },

  onNoteInput(e) {
    this.setData({ inputNote: e.detail.value })
  },

  // 编辑记录
  editRecord(e) {
    const { id } = e.currentTarget.dataset
    const record = this.data.records.find(r => r.recordId === id)
    
    if (record) {
      this.setData({
        showModal: true,
        editingId: id,
        inputWeight: record.weight,
        inputDate: record.recordDate,
        inputNote: record.notes || ''
      })
    }
  },

  // 保存记录
  async saveRecord() {
    const { currentPet, editingId, inputWeight, inputDate, inputNote } = this.data
    
    if (!inputWeight) {
      wx.showToast({ title: '请输入体重', icon: 'none' })
      return
    }
    
    if (!inputDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    
    try {
      const url = editingId ? urls.Weight+`/edit/${editingId}` : 
			urls.Weight+"/add";
      const method = editingId ? 'PUT' : 'POST'
      
      const res = await request({
        url,
        method,
        data: {
          petId: currentPet.petId,
          weight: parseFloat(inputWeight),
          recordDate: inputDate,
          notes: inputNote
        }
      })
      
      if (res.code === 200) {
        wx.showToast({
          title: editingId ? '修改成功' : '添加成功',
          icon: 'success'
        })
        this.hideModal()
        this.refreshData()
      }
    } catch (err) {
      console.error('保存记录失败', err)
    }
  },

  // 删除记录
  deleteRecord(e) {
    const { id } = e.currentTarget.dataset
    
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await request({
              url:  urls.Weight+`/${id}`,
              method: 'DELETE'
            })
            
            if (result.code === 200) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })
              this.refreshData()
            }
          } catch (err) {
            console.error('删除记录失败', err)
          }
        }
      }
    })
  }
})
