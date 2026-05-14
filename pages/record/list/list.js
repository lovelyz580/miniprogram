// list.js
const app = getApp()
const {
	request
} = require('../../../utils/request')
const {
	formatTime,
	formatImgUrl,
	isRichTextContent,
	debounce
} = require('../../../utils/util')
const urls = require('../../../utils/api')
Page({
	data: {
		// 搜索和筛选
		searchKeyword: '',
		filterType: 'all',
		currentSort: 'time_desc',
		sortIcon: '📅',
		sortText: '最新',
		// 宠物ID
		petId: '',
		// 记录列表
		records: [],
		page: 1,
		pageSize: 20,
		hasMore: true,
		isLoading: false,
		isRefreshing: false,

		// 选择模式
		isSelectionMode: true,
		selectedList: [],
		isSelectAll: false,

		// 弹窗控制
		showCreateModal: false,
		showSortModal: false,
		// 骨架屏
		showSkeleton: true
	},

	onLoad(options) {
		this.debouncedSearch = debounce(() => {
			this.setData({ page: 1 })
			this.getRecords()
		}, 300)

		if (options.type) {
			this.setData({
				filterType: options.type
			})
		}
	},

	onShow() {
		this.getRecords()
	},

	// 获取记录列表
	async getRecords() {

		if (this.data.isLoading) return
		const userInfo = wx.getStorageSync('userInfo')
		const petId = wx.getStorageSync('petId')
		if (!userInfo) return
		if (!petId) return
		try {

			this.setData({
				isLoading: true,
				userInfo,
				petId
			})

			const params = {
				page: this.data.page,
				pageSize: this.data.pageSize,
				type: this.data.filterType,
				petId: this.data.petId,
				userId: this.data.userInfo.userId,
				sort: this.data.currentSort
			}

			if (this.data.searchKeyword) {
				params.keyword = this.data.searchKeyword
			}

			const res = await request({
				url: urls.recordlist,
			  method: 'POST',
				data: params
			})
			
			if (res.code === 200) {
				const records = (res.rows || []).map(item => ({
					...item,
					typeIcon: this.getTypeIcon(item.recordType),
					typeName: this.getTypeName(item.recordType),
					isRichContent: isRichTextContent(item.content),
					mediaUrls:formatImgUrl(item.mediaUrls),
				}))

				this.setData({
					records: this.data.page === 1 ? records : [...this.data.records, ...records],
					hasMore: records.length >= this.data.pageSize,
					isLoading: false,
					isRefreshing: false,
					showSkeleton: false
				})
			} else {
				this.setData({
					isLoading: false,
					isRefreshing: false,
					showSkeleton: false
				})
			}
		} catch (err) {
			console.error('获取记录列表失败', err)
			this.setData({
				isLoading: false,
				isRefreshing: false
			})
		}
	},

	// 获取类型图标
	getTypeIcon(type) {
		const icons = {
			1: '💭',
			2: '📝',
			3: '🏆'
		}
		return icons[type] || '📝'
	},

	// 获取类型名称
	getTypeName(type) {
		const names = {
			1: '心情气泡',
			2: '日记',
			3: '里程碑',
			4:'问答'
		}
		return names[type] || '日记'
	},

	// 刷新
	onRefresh() {
		this.setData({
			page: 1,
			isRefreshing: true
		})
		this.getRecords()
	},

	// 加载更多
	loadMore() {
		if (!this.data.hasMore || this.data.isLoading) return

		this.setData({
			page: this.data.page + 1
		})
		this.getRecords()
	},

	// 搜索输入
	// 搜索输入（防抖）
	onSearchInput(e) {
		this.setData({
			searchKeyword: e.detail.value
		})
		this.debouncedSearch()
	},

	// 防抖搜索
	debouncedSearch: null,

	// 清除搜索
	clearSearch() {
		this.setData({
			searchKeyword: '',
			page: 1
		})
		this.getRecords()
	},

	// 执行搜索
	onSearch() {
		this.setData({
			page: 1
		})
		this.getRecords()
	},

	// 筛选类型
	onFilterType(e) {
		const type = e.currentTarget.dataset.type
		if (type === this.data.filterType) return

		this.setData({
			filterType: type,
			page: 1
		})
		this.getRecords()
	},

	// 显示排序选择
	showSortPicker() {
		this.setData({
			showSortModal: true
		})
	},

	hideSortModal() {
		this.setData({
			showSortModal: false
		})
	},

	// 切换排序
	onSortChange(e) {
		const sort = e.currentTarget.dataset.sort
		const sortOptions = {
			'time_desc': {
				icon: '📅',
				text: '最新'
			},
			'time_asc': {
				icon: '📆',
				text: '最早'
			},
			'like_desc': {
				icon: '❤️',
				text: '最热'
			},
			'comment_desc': {
				icon: '💬',
				text: '热议'
			}
		}

		this.setData({
			currentSort: sort,
			sortIcon: sortOptions[sort].icon,
			sortText: sortOptions[sort].text,
			showSortModal: false,
			page: 1
		})
		this.getRecords()
	},

	// 跳转详情
	goToDetail(e) {
		// if (this.data.isSelectionMode) return
		const id = e.currentTarget.dataset.item.recordId;
		const type = e.currentTarget.dataset.item.recordType;
		if(type===1 || type===0){
			wx.navigateTo({
				url: `/pages/record/detail/detail?id=${id}`
			})
		}else if(type===4){
			wx.navigateTo({
				url: `/pages/record/daily-question/daily-question?type=answer&id=${id}`
			})
		}else if(type===3){
			wx.navigateTo({
				url: `/pages/record/detail/detail?id=${id}&recordType=milestone`
			})
		}
	
	},

	// 长按选择
	onLongPress(e) {
		const item = e.currentTarget.dataset.item
		this.setData({
			isSelectionMode: true,
			selectedList: [item.id]
		})
	},

	// 选择/取消选择
	onSelectItem(e) {
		const id = e.currentTarget.dataset.id
		const selectedList = [...this.data.selectedList]
		const index = selectedList.indexOf(id)

		if (index > -1) {
			selectedList.splice(index, 1)
		} else {
			selectedList.push(id)
		}

		this.setData({
			selectedList,
			isSelectAll: selectedList.length === this.data.records.length
		})
	},

	// 全选/取消全选
	selectAll() {
		if (this.data.isSelectAll) {
			this.setData({
				selectedList: [],
				isSelectAll: false
			})
		} else {
			this.setData({
				selectedList: this.data.records.map(item => item.id),
				isSelectAll: true
			})
		}
	},

	// 批量删除
	batchDelete() {
		if (this.data.selectedList.length === 0) return

		wx.showModal({
			title: '确认删除',
			content: `确定要删除选中的 ${this.data.selectedList.length} 条记录吗？`,
			success: async (res) => {
				if (res.confirm) {
					try {
						wx.showLoading({
							title: '删除中...'
						})

						await request({
							url: '/api/record/batch-delete',
							method: 'POST',
							data: {
								ids: this.data.selectedList
							}
						})

						wx.hideLoading()
						wx.showToast({
							title: '删除成功',
							icon: 'success'
						})

						this.setData({
							isSelectionMode: true,
							selectedList: [],
							page: 1
						})
						this.getRecords()
					} catch (err) {
						console.error('批量删除失败', err)
						wx.hideLoading()
					}
				}
			}
		})
	},

	// 显示创建选项
	showCreateOptions() {
		this.setData({
			showCreateModal: true
		})
	},

	hideCreateModal() {
		this.setData({
			showCreateModal: false
		})
	},

	// 创建日记
	createDiary() {
		this.hideCreateModal()
		wx.navigateTo({
			url: '/pages/record/diary/diary'
		})
	},

	// 创建问答
	createQuestion() {
		this.hideCreateModal()
		wx.navigateTo({
			url: '/pages/record/daily-question/daily-question'
		})
	},

	// 创建里程碑
	createMilestone() {
		this.hideCreateModal()
		wx.navigateTo({
			url: '/pages/record/milestone/milestone'
		})
	},

	// 跳转创建页面
	goToCreate() {
		this.showCreateOptions()
	},

	// 退出选择模式
	onUnload() {
		if (this.data.isSelectionMode) {
			this.setData({
				isSelectionMode: true,
				selectedList: []
			})
		}
	}
})
