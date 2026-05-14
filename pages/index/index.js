// index.js
const app = getApp()
const {
	request
} = require('../../utils/request')
const {
	formatTime,
	calculatePetAge,
	formatImgUrl,
	isRichTextContent
} = require('../../utils/util')
const urls = require('../../utils/api')
Page({
	data: {
		// 用户信息
		userInfo: null,

		// 当前宠物
		currentPet: null,
		petList: [],

		// 健康提醒
		reminder: null,
		hasHealthReminder: false,
		reminderCount: 0,

		// 时光轴记录
		records: [],
		page: 1,
		pageSize: 10,
		hasMore: true,
		isLoading: false,
		isRefreshing: false,

		// 弹窗控制
		showRecordModal: false,
		showPetModal: false,
		showQuestion: false,
		// 骨架屏
		showSkeleton: true
	},

	onLoad() {

		console.log("执行onLoad")
		this.initPage()
	},

	onShow() {
		console.log("执行onShow")
		// 刷新数据
		this.refreshData()
	},

	// 初始化页面
	async initPage() {
		try {
			await this.getSysinfo();
			await this.getUserInfo()
			await this.getPetList()
			await this.getReminder()
			await this.getRecords()
		} catch (err) {
			console.error('初始化失败', err)
			wx.showToast({
				title: '加载失败',
				icon: 'none'
			})
		} finally {
			this.setData({ showSkeleton: false })
		}
	},
	async getSysinfo() {
		try {
			const res = await request({
				url: urls.sysInfo,
				method: 'GET',
				data: {}
			})
			if (res.code === 200) {
				this.setData({
					showQuestion: res.data.showQuestion
				})
			}
		} catch (err) {
			console.error('获取健康提醒失败', err)
		}
	},
	// 获取用户信息
	async getUserInfo() {
		const userInfo = wx.getStorageSync('userInfo')
		if (userInfo) {
			this.setData({
				userInfo
			})
		}
	},
	// 跳转登录
	goToLogin() {
		wx.navigateTo({
			url: '/pages/login/login'
		})
	},
	// 获取宠物列表
	async getPetList() {
		if (!this.data.userInfo) return
		const result = await app.refreshPetList(this.data.userInfo.userId)
		if (result) {
			this.setData({
				petList: result.petList,
				currentPet: result.currentPet
			})
		}
	},

	// 获取健康提醒
	async getReminder() {
		if (!this.data.currentPet) return

		try {
			const res = await request({
				url: urls.upcoming,
				method: 'GET',
				data: {
					petId: this.data.currentPet.petId,
					days: 3
				}
			})

			if (res.code === 200 && res.data.length > 0) {
				const reminder = res.data[0]
				this.setData({
					reminder,
					hasHealthReminder: true,
					reminderCount: 1
				})
			} else {
				this.setData({
					reminder: null,
					hasHealthReminder: false,
					reminderCount: 0
				})
			}
		} catch (err) {
			console.error('获取提醒失败', err)
		}
	},

	// 获取时光轴记录
	async getRecords(refresh = false) {
		if (this.data.isLoading) return
		if (!refresh && !this.data.hasMore) return
		if (!this.data.currentPet) return
		this.setData({
			isLoading: true
		})
		try {
			const page = refresh ? 1 : this.data.page
			const res = await request({
				url: urls.timelinelist,
				method: 'POST',
				data: {
					petId: this.data.currentPet.petId,
					page,
					pageSize: this.data.pageSize
				}
			})

			if (res.code === 200) {
				const newRecords = res.rows || []
				const records = refresh ? newRecords : [...this.data.records, ...newRecords];
				// 格式化记录数据
				const formattedRecords = records.map(record => ({
					...record,
					mediaUrls: formatImgUrl(record.mediaUrls),
					isRichContent: isRichTextContent(record.content),
					createTime: formatTime(new Date(record.createTime), 'yyyy.MM.dd'),
					petAgeDays: calculatePetAge(this.data.currentPet.adoptDate, new Date(record.createTime))
				}))

				this.setData({
					records: formattedRecords,
					page: page + 1,
					hasMore: newRecords.length >= this.data.pageSize,
					isLoading: false,
					isRefreshing: false
				})
			}
		} catch (err) {
			console.error('获取记录失败', err)
			this.setData({
				isLoading: false,
				isRefreshing: false
			})
		}
	},

	// 刷新数据
	async refreshData() {
		await this.getSysinfo();
		await this.getPetList();
		await this.getNowPet();
		await this.getReminder();
		await this.getRecords(true);
	},

	// 下拉刷新
	onRefresh() {
		this.setData({
			isRefreshing: true
		})
		this.refreshData()
	},

	// 加载更多
	loadMore() {
		if (!this.data.isLoading && this.data.hasMore) {
			this.getRecords()
		}
	},

	// 显示宠物选择器
	showPetSelector() {
		this.setData({
			showPetModal: true
		})
	},

	// 隐藏宠物选择器
	hidePetSelector() {
		this.setData({
			showPetModal: false
		})
	},
	// 获取当前宠物
	getNowPet() {
		const petList = this.data.petList;
		const petId = wx.getStorageSync('petId')
		const currentPet = petList.find(p => p.petId === petId) || petList[0]
		this.setData({
			currentPet
		})
	},

	// 选择宠物
	selectPet(e) {
		const pet = e.currentTarget.dataset.pet
		this.setData({
			currentPet: pet,
			showPetModal: false
		})
		wx.setStorageSync('petId', pet.petId)
		// 刷新记录
		this.getRecords(true)
		this.getReminder()
	},

	// 添加宠物
	goToAddPet() {
		this.setData({
			showPetModal: false
		})
		wx.navigateTo({
			url: '/pages/pet/add/add'
		})
	},

	// 显示记录选项
	showRecordOptions() {
		this.setData({
			showRecordModal: true
		})
	},

	// 隐藏记录选项
	hideRecordOptions() {
		this.setData({
			showRecordModal: false
		})
	},

	// 跳转到心情气泡
	goToMoodBubble() {
		const userInfo = wx.getStorageSync('userInfo') || null;
		if (userInfo == null) {
			this.goToLogin()
			return;
		}
		this.setData({
			showRecordModal: false
		})
		wx.navigateTo({
			url: '/pages/record/mood-bubble/mood-bubble'
		})
	},

	// 跳转到写日记
	goToWriteDiary() {
		const userInfo = wx.getStorageSync('userInfo') || null;
		if (userInfo == null) {
			this.goToLogin()
			return;
		}
		this.setData({
			showRecordModal: false
		})
		wx.navigateTo({
			url: '/pages/record/diary/diary'
		})
	},

	// 跳转到今日问答
	goToDailyQuestion() {
		const userInfo = wx.getStorageSync('userInfo') || null;
		if (userInfo == null) {
			this.goToLogin()
			return;
		}
		this.setData({
			showRecordModal: false
		})
		wx.navigateTo({
			url: '/pages/record/daily-question/daily-question'
		})
	},

	// 跳转到里程碑
	goToMilestone() {
		const userInfo = wx.getStorageSync('userInfo') || null;
		if (userInfo == null) {
			this.goToLogin()
			return;
		}
		this.setData({
			showRecordModal: false
		})
		wx.navigateTo({
			url: '/pages/record/milestone/milestone'
		})
	},

	// 跳转到记录详情
	goToRecordDetail(e) {
		const id = e.currentTarget.dataset.id
		wx.navigateTo({
			url: `/pages/record/detail/detail?id=${id}` + "&recordType=timeline"
		})
	},

	// 点赞
	async toggleLike(e) {
		const id = e.currentTarget.dataset.id
		const record = this.data.records.find(r => r.id === id)
		if (!record) return

		try {
			const res = await request({
				url: '/api/timeline/like',
				method: 'POST',
				data: {
					recordId: id
				}
			})

			if (res.code === 0) {
				const records = this.data.records.map(r => {
					if (r.id === id) {
						return {
							...r,
							isLiked: !r.isLiked,
							likeCount: r.isLiked ? r.likeCount - 1 : r.likeCount + 1
						}
					}
					return r
				})
				this.setData({
					records
				})
			}
		} catch (err) {
			console.error('点赞失败', err)
		}
	},

	// 跳转到评论
	goToComment(e) {
		const id = e.currentTarget.dataset.id
		wx.navigateTo({
			url: `/pages/record/detail/detail?id=${id}&focusComment=true`
		})
	},

	// 跳转到健康页面
	goToHealth() {
		wx.switchTab({
			url: '/pages/health/index/index'
		})
	},

	// 跳转到个人中心
	goToProfile() {
		wx.switchTab({
			url: '/pages/profile/index'
		})
	},

	// 切换Tab
	switchTab(e) {
		const tab = e.currentTarget.dataset.tab
		const urlMap = {
			'index': '/pages/index/index',
			'health': '/pages/health/index',
			'record': '/pages/record/list',
			'reminder': '/pages/reminder/index',
			'profile': '/pages/profile/index'
		}

		wx.switchTab({
			url: urlMap[tab]
		})
	},

	// 显示筛选
	showFilter() {
		wx.showActionSheet({
			itemList: ['全部记录', '心情气泡', '里程碑', '健康记录'],
			success: (res) => {
				console.log('选择筛选', res.tapIndex)
				// TODO: 实现筛选逻辑
			}
		})
	},

	// 分享
	onShareAppMessage() {
		return {
			title: `记录我和${this.data.currentPet.name || '宠物'}的每一天`,
			path: '/pages/index/index',
			imageUrl: this.data.currentPet.avatarUrl
		}
	}
})
