// pages/health/vaccine.js
const app = getApp()
const { request } = require('../../../utils/request')
const { formatTime, calculatePetAgeFormat } = require('../../../utils/util')
const urls = require('../../../utils/api')
Page({
  data: {
    // 宠物信息
    currentPet: null,
    
    // 统计数据
    totalCount: 0,
    nextVaccineDays: '--',
    protectedCount: 0,
    
    // 下次接种提醒
    nextVaccine: null,
    
    // 记录列表
    records: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    isLoading: false,
    isRefreshing: false
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
      await this.getPetInfo()
      await this.getVaccineStats()
      await this.getNextVaccine()
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
      await this.getVaccineStats()
      await this.getNextVaccine()
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
			this.setData({
				currentPet
			})
		}
	},

  // 获取疫苗统计数据
  async getVaccineStats() {
    const petId = this.data.currentPet.petId
    if (!petId) return
    
    try {
      const res = await request({
        url: urls.vaccineStats,
        method: 'GET',
        data: { petId }
      })
      
      if (res.code === 200) {
        this.setData({
          totalCount: res.data.totalCount || 0,
          protectedCount: res.data.protectedCount || 0
        })
      }
    } catch (err) {
      console.error('获取疫苗统计失败', err)
    }
  },

  // 获取下次疫苗接种
  async getNextVaccine() {
    const petId = this.data.currentPet.petId
    if (!petId) return
    
    try {
      const res = await request({
        url: urls.vaccineNext,
        method: 'GET',
        data: { petId }
      })
      
      if (res.code === 200 && res.data) {
        const nextVaccine = res.data
        const days = this.calculateDaysUntil(nextVaccine.nextDate)
        
        this.setData({
          nextVaccine,
          nextVaccineDays: days > 0 ? days : 0
        })
      }
    } catch (err) {
      console.error('获取下次疫苗失败', err)
    }
  },

  // 计算距离日期天数
  calculateDaysUntil(dateStr) {
    if (!dateStr) return 0
    const target = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    target.setHours(0, 0, 0, 0)
    const diff = target - today
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  },

  // 获取疫苗记录列表
  async getRecords(refresh = false) {
    const { currentPet, page, pageSize } = this.data
    if (!currentPet) return
    
    if (refresh) {
      this.setData({ page: 1, records: [], isRefreshing: true })
    }
    
    try {
      const res = await request({
        url: urls.vaccineList,
        method: 'POST',
        data: {
          petId: currentPet.petId,
          page,
          pageSize
        }
      })
      
      if (res.code === 200) {
        const records = (res.rows || []).map(item => ({
          ...item,
          petAge: calculatePetAgeFormat(currentPet.birthDate || currentPet.adoptDate, item.vaccineDate)
        }))
        
        this.setData({
          records: refresh ? records : [...this.data.records, ...records],
          hasMore: records.length === pageSize,
          page: page + 1,
          isRefreshing: false
        })
      }
    } catch (err) {
      console.error('获取疫苗记录失败', err)
      this.setData({ isRefreshing: false })
    }
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

  // 显示下次疫苗详情
  showNextDetail() {
    const { nextVaccine } = this.data
    if (!nextVaccine) return
    
    wx.showModal({
      title: nextVaccine.vaccineName,
      content: `建议接种时间：${nextVaccine.vaccineDate}\n疫苗类型：${nextVaccine.vaccineType || '常规疫苗'}`,
      showCancel: true,
      confirmText: '已接种',
      cancelText: '知道了',
      success: (res) => {
        if (res.confirm) {
          this.goToAdd()
        }
      }
    })
  },

  // 显示记录详情
  showDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/health/vaccine-detail?id=${id}`
    })
  },

  // 跳转添加页面
  goToAdd() {
    wx.navigateTo({
      url: '/pages/health/vaccine-add/vaccine-add'
    })
  }
})
