// pages/health/medication/medication.js
const app = getApp()
const {
	request
} = require('../../../utils/request')
const {
	formatTime,
	calculatePetAgeFormat
} = require('../../../utils/util')
const urls = require('../../../utils/api')
Page({
	data: {
		// 宠物信息
		currentPet: null,

		// 统计数据
		totalCount: 0,
		ongoingCount: 0,
		completedCount: 0,

		// 记录列表
		records: [],
		page: 1,
		pageSize: 20,
		hasMore: false,
		isLoading: false,
		isRefreshing: false,

		// 当前状态筛选
		statusFilter: 'all', // all, ongoing, completed

		// 详情弹窗
		showDetail: false,
		currentRecord: null
	},

	onLoad() {
		this.initPage()
	},

	onShow() {
		// this.refreshData()
	},

	// onPullDownRefresh() {
	//   this.refreshData().finally(() => {
	//     wx.stopPullDownRefresh()
	//   })
	// },

	// 初始化页面
	async initPage() {
		try {
			await this.getPetInfo()
			await this.getStats()
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
		this.setData({
			isLoading: true
		})
		try {
			await this.getStats()
			await this.getRecords(true)
		} catch (err) {
			console.error('刷新数据失败', err)
		} finally {
			this.setData({
				isLoading: false
			})
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

	// 获取统计数据
	async getStats() {
		const petId = this.data.currentPet?.petId
		if (!petId) return

		try {
			const res = await request({
				url: urls.medicationStatus,
				method: 'GET',
				data: {
					petId
				}
			})

			if (res.code === 200) {
				this.setData({
					totalCount: res.data.totalCount || 0,
					ongoingCount: res.data.ongoingCount || 0,
					completedCount: res.data.completedCount || 0
				})
			}
		} catch (err) {
			console.error('获取用药统计失败', err)
		}
	},

	// 获取用药记录列表
	async getRecords(refresh = false) {
		const {
			currentPet,
			page,
			pageSize,
			statusFilter
		} = this.data
		if (!currentPet) return

		if (refresh) {
			this.setData({
				page: 1,
				records: [],
				isRefreshing: true
			})
		}

		try {
			const res = await request({
				url: urls.medicationList,
				method: 'POST',
				data: {
					petId: currentPet.petId,
					page,
					pageSize,
					status: statusFilter === 'all' ? '' : statusFilter
				}
			})

			if (res.code === 200) {
				const records = (res.rows || []).map(item => ({
					...item,
					// 计算状态
					isOngoing: this.isOngoing(item.startDate, item.endDate),
					// 计算进度
					progress: this.calculateProgress(item.startDate, item.endDate)
				}))

				this.setData({
					records: refresh ? records : [...this.data.records, ...records],
					hasMore: records.length === pageSize,
					page: page + 1,
					isRefreshing: false
				})
			}
		} catch (err) {
			console.error('获取用药记录失败', err)
			this.setData({
				isRefreshing: false
			})
		}
	},

	// 判断是否正在进行
	isOngoing(startDate, endDate) {
		if (!startDate) return false
		const now = new Date()
		const start = new Date(startDate)
		const end = endDate ? new Date(endDate) : null
		if (now < start) {
      return 'not_started';
    }else if(now >= start && (now <= end || end===null)){
			return 'ongoing';
		}else{
			return 'completed';
		}
		
	},

	// 计算进度
	calculateProgress(startDate, endDate) {
		if (!startDate) return 0
		const now = new Date()
		const start = new Date(startDate)
		const end = endDate ? new Date(endDate) : null

		if (!end) return 100

		const total = end - start
		const elapsed = now - start

		if (elapsed <= 0) return 0
		if (elapsed >= total) return 100

		return Math.round((elapsed / total) * 100)
	},

	// 切换状态筛选
	changeFilter(e) {
		const status = e.currentTarget.dataset.status
		if (status === this.data.statusFilter) return

		this.setData({
			statusFilter: status
		})
		this.getRecords(true)
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

	// 显示详情
	showRecordDetail(e) {
		const record = e.currentTarget.dataset.record
		this.setData({
			showDetail: true,
			currentRecord: record
		})
	},

	// 关闭详情弹窗
	closeDetail() {
		this.setData({
			showDetail: false,
			currentRecord: null
		})
	},

	// 删除记录
	deleteRecord(e) {
		const id = e.currentTarget.dataset.id
		wx.showModal({
			title: '确认删除',
			content: '确定要删除这条用药记录吗？',
			success: async (res) => {
				if (res.confirm) {
					try {
						const result = await request({
							url: urls.Medication+`/${id}`,
							method: 'DELETE'
						})

						if (result.code === 200) {
							wx.showToast({
								title: '删除成功',
								icon: 'success'
							})
							this.refreshData()
						} else {
							wx.showToast({
								title: result.msg || '删除失败',
								icon: 'none'
							})
						}
					} catch (err) {
						console.error('删除用药记录失败', err)
						wx.showToast({
							title: '删除失败',
							icon: 'none'
						})
					}
				}
			}
		})
	},

	// 跳转到添加页面
	goToAdd() {
		wx.navigateTo({
			url: '/pages/health/medication-add/medication-add'
		})
	},

	// 设置用药提醒
	setReminder(e) {
		const record = e.currentTarget.dataset.record

		wx.showModal({
			title: '设置提醒',
			content: `为"${record.medicationName}"设置用药提醒？`,
			success: (res) => {
				if (res.confirm) {
					 this.createReminder(record.recordId, record.medicationName,
						 record.startDate, record.endDate, record.reminderTime)
				}
			}
		})
	},
	  // 创建用药提醒
		async createReminder(recordId, medicationName, startDate, 
			endDate, reminderTime) {
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
						remindTime: reminderTime || '09:00',
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
})