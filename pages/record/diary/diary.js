// diary.js
const app = getApp()
const {
	request
} = require('../../../utils/request')
const {
	formatTime,
	calculatePetAge,
	UploadImages
} = require('../../../utils/util')
const urls = require('../../../utils/api')
Page({
	data: {
		// 编辑内容
		content: '',
		contentHtml: '',
		editorFormats: {},
		isEditorReady: false,
		mediaList: [],
		location: '',
		selectedTag: '',
		selectedDate: '',
		selectedPet: null,

		// 编辑状态
		canPublish: false,
		// 宠物列表
		petList: [],

		// 标签选项
		tagOptions: [{
				label: '日常',
				value: 'daily'
			},
			{
				label: '出行',
				value: 'outdoor'
			},
			{
				label: '饮食',
				value: 'food'
			},
			{
				label: '玩耍',
				value: 'play'
			},
			{
				label: '健康',
				value: 'health'
			},
			{
				label: '训练',
				value: 'training'
			},
			{
				label: '美容',
				value: 'grooming'
			},
			{
				label: '睡觉',
				value: 'sleep'
			}
		],

		// 弹窗控制
		showDatePickerModal: false,
		showPetPickerModal: false,
		showMediaPickerModal: false,

		// 日期选择器数据
		years: [],
		months: [],
		days: [],
		datePickerValue: [0, 0, 0],

		// 草稿ID
		draftId: null,

		// 页面来源
		fromDraft: false
	},

	onLoad(options) {
		this.initData()

		// 如果是编辑草稿或编辑记录
		if (options.draftId) {
			this.setData({
				draftId: options.draftId,
				fromDraft: true
			})
			this.loadDraft(options.draftId)
		} else if (options.recordId) {
			this.setData({
				draftId: options.recordId,
				fromDraft: true
			})
			this.loadRecord(options.recordId)
		}

		// 获取宠物列表
		this.getPetList()
	},

	// 初始化数据
	initData() {
		const now = new Date()
		const userInfo = wx.getStorageSync('userInfo')
		this.setData({
			selectedDate: formatTime(now, 'yyyy-MM-dd'),
			userInfo
		})
		this.initDatePicker()
	},

	// 初始化日期选择器
	initDatePicker() {
		const now = new Date()
		const years = []
		const months = []
		const days = []

		// 生成年份（前后10年）
		for (let i = now.getFullYear() - 10; i <= now.getFullYear(); i++) {
			years.push(i)
		}

		// 生成月份
		for (let i = 1; i <= 12; i++) {
			months.push(i)
		}

		// 生成日期
		for (let i = 1; i <= 31; i++) {
			days.push(i)
		}

		this.setData({
			years,
			months,
			days,
			datePickerValue: [10, now.getMonth(), now.getDate() - 1]
		})
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
					selectedPet: currentPet || petList[0]
				})
				this.checkCanPublish()
			}
		} catch (err) {
			console.error('获取宠物列表失败', err)
		}
	},

	// 加载草稿
	async loadDraft(draftId) {
		try {
			wx.showLoading({
				title: '加载中...'
			})

			const res = await request({
				url: `/api/draft/${draftId}`,
				method: 'GET'
			})

			if (res.code === 200 && res.data) {
				const draft = res.data
				const selectedPet = this.data.petList.find(p => p.petId === draft.petId) || this.data.selectedPet

				this.setData({
					content: draft.content,
					contentHtml: draft.content || '',
					mediaList: draft.mediaList || [],
					location: draft.location || '',
					selectedTag: draft.tag || '',
					selectedDate: draft.recordDate || this.data.selectedDate,
					selectedPet
				})
				this.setEditorContents()
			}

			wx.hideLoading()
		} catch (err) {
			console.error('加载草稿失败', err)
			wx.hideLoading()
		}
	},

	// 加载记录
	async loadRecord(recordId) {
		try {
			wx.showLoading({
				title: '加载中...'
			})

			const res = await request({
				url: `/api/record/${recordId}`,
				method: 'GET'
			})

			if (res.code === 0 && res.data) {
				const record = res.data
				const selectedPet = this.data.petList.find(p => p.id === record.petId) || this.data.selectedPet

				this.setData({
					content: record.content,
					contentHtml: record.content || '',
					mediaList: record.mediaUrls || [],
					location: record.location || '',
					selectedTag: record.tag || '',
					selectedDate: record.recordDate || this.data.selectedDate,
					selectedPet
				})
				this.setEditorContents()
			}

			wx.hideLoading()
		} catch (err) {
			console.error('加载记录失败', err)
			wx.hideLoading()
		}
	},

	onEditorReady() {
		wx.createSelectorQuery()
			.select('#diaryEditor')
			.context((res) => {
				this.editorCtx = res.context
				this.setData({ isEditorReady: true })
				this.setEditorContents()
			})
			.exec()
	},

	setEditorContents() {
		if (!this.editorCtx || !this.data.isEditorReady) return
		const html = this.data.contentHtml || this.data.content || ''
		if (!html) return
		this.editorCtx.setContents({
			html,
			fail: (err) => console.error('设置编辑器内容失败', err)
		})
	},

	// 富文本内容输入
	onEditorInput(e) {
		const text = (e.detail.text || '').replace(/\n$/, '')
		this.setData({
			content: text.slice(0, 5000),
			contentHtml: e.detail.html || ''
		})
		this.checkCanPublish()
	},

	onEditorStatusChange(e) {
		this.setData({ editorFormats: e.detail })
	},

	formatEditor(e) {
		if (!this.editorCtx) return
		const { name, value } = e.currentTarget.dataset
		this.editorCtx.format(name, value || null)
	},

	undoEditor() {
		if (this.editorCtx) this.editorCtx.undo()
	},

	redoEditor() {
		if (this.editorCtx) this.editorCtx.redo()
	},

	clearEditor() {
		if (!this.data.content && !this.data.contentHtml) return
		wx.showModal({
			title: '清空内容',
			content: '确定清空当前日记正文吗？',
			confirmText: '清空',
			confirmColor: '#D85D52',
			success: (res) => {
				if (!res.confirm || !this.editorCtx) return
				this.editorCtx.clear()
				this.setData({
					content: '',
					contentHtml: '',
					editorFormats: {}
				})
				this.checkCanPublish()
			}
		})
	},

	insertEmoji() {
		const emojis = ['😀', '😄', '🥰', '😍', '🤩', '😘', '🐶', '🐱', '🐕', '🐾', '🎾', '🏃', '🍖', '🛁', '💤', '❤️', '⭐']
		const emoji = emojis[Math.floor(Math.random() * emojis.length)]
		if (this.editorCtx) {
			this.editorCtx.insertText({ text: emoji })
		}
	},
	// 检查是否可以发布
	checkCanPublish() {
		const canPublish = !!this.data.selectedPet && (this.data.content.trim() !== '' || this.data.mediaList.length > 0)
		this.setData({
			canPublish
		})
	},

	getSubmitContent() {
		return this.data.contentHtml || this.data.content
	},

	// 日期选择
	showDatePicker() {
		this.setData({
			showDatePickerModal: true
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

		this.setData({
			selectedDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
		})
	},

	confirmDate() {
		this.setData({
			showDatePickerModal: false
		})
	},

	// 宠物选择
	showPetPicker() {
		this.setData({
			showPetPickerModal: true
		})
	},

	hidePetPicker() {
		this.setData({
			showPetPickerModal: false
		})
	},

	selectPet(e) {
		const pet = e.currentTarget.dataset.pet
		this.setData({
			selectedPet: pet,
			showPetPickerModal: false
		})
		this.checkCanPublish()
	},

	goToAddPet() {
		wx.navigateTo({
			url: '/pages/pet/add/add'
		})
	},

	// 媒体选择
	showMediaPicker() {
		this.setData({
			showMediaPickerModal: true
		})
	},

	hideMediaPicker() {
		this.setData({
			showMediaPickerModal: false
		})
	},

	chooseImage() {
		this.hideMediaPicker()

		const remaining = 9 - this.data.mediaList.length
		wx.chooseImage({
			count: remaining,
			sizeType: ['compressed'],
			sourceType: ['album', 'camera'],
			success: (res) => {
				const newImages = res.tempFilePaths.map(path => ({
					url: path,
					type: 'image'
				}))
				this.setData({
					mediaList: [...this.data.mediaList, ...newImages]
				})
				this.checkCanPublish()
			}
		})

	},

	chooseVideo() {
		this.hideMediaPicker()
		wx.chooseVideo({
			maxDuration: 60,
			sourceType: ['album', 'camera'],
			success: (res) => {
				const video = {
					url: res.tempFilePath,
					type: 'video',
					thumbnail: res.thumbTempFilePath
				}

				if (this.data.mediaList.length < 9) {
					this.setData({
						mediaList: [...this.data.mediaList, video]
					})
				} else {
					wx.showToast({
						title: '最多添加9个媒体',
						icon: 'none'
					})
				}
				this.checkCanPublish()
			}
		})

	},

	deleteMedia(e) {
		const index = e.currentTarget.dataset.index
		const mediaList = [...this.data.mediaList]
		mediaList.splice(index, 1)
		this.setData({
			mediaList
		})
		this.checkCanPublish()
	},

	previewImage(e) {
		const index = e.currentTarget.dataset.index
		const urls = this.data.mediaList
			.filter(item => item.type === 'image')
			.map(item => item.url)

		wx.previewImage({
			current: urls[index],
			urls
		})
	},

	// 标签选择
	selectTag(e) {
		const value = e.currentTarget.dataset.value
		this.setData({
			selectedTag: this.data.selectedTag === value ? '' : value
		})
		this.checkCanPublish()
	},

	// 位置获取
	getLocation() {

		wx.getLocation({
			type: 'gcj02',
			success: async (res) => {
				try {
					// 逆地理编码获取地址// 调用逆地址解析方法
					qqmapsdk.reverseGeocoder({
						location: {
							latitude: res.latitude,
							longitude: res.longitude
						},
						success: (addressRes) => {
							console.log('详细地址：', addressRes.result.address);
							this.setData({
								location: addressRes.result.address
							})
						},
						fail: (error) => {
							console.error('解析地址失败：', error);
						}
					});
				} catch (err) {
					console.error('获取地址失败', err)
					this.setData({
						location: '未知位置'
					})
				}
			},
			fail: () => {
				wx.showToast({
					title: '获取位置失败',
					icon: 'none'
				})
			}
		})
	},



	clearLocation() {
		this.setData({
			location: ''
		})
	},

	// 取消
	onCancel() {
		if (this.data.content || this.data.mediaList.length > 0) {
			wx.showModal({
				title: '提示',
				content: '是否保存为草稿？',
				confirmText: '保存',
				cancelText: '不保存',
				success: (res) => {
					if (res.confirm) {
						this.saveDraft()
					} else {
						wx.navigateBack()
					}
				}
			})
		} else {
			wx.navigateBack()
		}
	},

	// 保存草稿
	async saveDraft() {
		try {
			wx.showLoading({
				title: '保存中...'
			})
			const data = {
				content: this.getSubmitContent(),
				mediaList: this.data.mediaList,
				location: this.data.location,
				moodTag: this.data.selectedTag,
				recordDate: this.data.selectedDate,
				petId: this.data.selectedPet && this.data.selectedPet.petId
			}

			let res
			if (this.data.draftId) {
				res = await request({
					url: `/api/draft/${this.data.draftId}`,
					method: 'PUT',
					data
				})
			} else {
				res = await request({
					url: '/api/draft',
					method: 'POST',
					data
				})
			}

			wx.hideLoading()

			if (res.code === 0) {
				wx.showToast({
					title: '草稿已保存',
					icon: 'success'
				})
				wx.navigateBack()
			}
		} catch (err) {
			console.error('保存草稿失败', err)
			wx.hideLoading()
		}
	},

	// 预览
	onPreview() {
		if (this.data.content === '' && this.data.mediaList.length === 0) {
			wx.showToast({
				title: '请先添加内容',
				icon: 'none'
			})
			return
		}

		// 保存到全局用于预览
		const previewContent = this.getSubmitContent()
		app.globalData.previewRecord = {
			content: previewContent,
			isRichContent: /<\/?[a-z][\s\S]*>/i.test(previewContent),
			mediaList: this.data.mediaList,
			mediaUrls: this.data.mediaList,
			location: this.data.location,
			moodTag: this.data.selectedTag,
			recordDate: this.data.selectedDate,
			pet: this.data.selectedPet,
			petName: this.data.selectedPet && this.data.selectedPet.name,
			petAvatarUrl: this.data.selectedPet && this.data.selectedPet.avatarUrl,
			nickname: this.data.userInfo && this.data.userInfo.nickname,
			avatarUrl: this.data.userInfo && this.data.userInfo.avatarUrl,
			createTime: this.data.selectedDate
		}

		wx.navigateTo({
			url: '/pages/record/detail/detail?isPreview=true'
		})
	},

	// 发布
	async onPublish() {
		if (this.data.content === '' && this.data.mediaList.length === 0) {
			wx.showToast({
				title: '请先添加内容',
				icon: 'none'
			})
			return
		}

		if (this.data.content.length > 5000) {
			wx.showToast({
				title: '日记内容不能超过5000字',
				icon: 'none'
			})
			return
		}

		if (!this.data.selectedPet) {
			wx.showToast({
				title: '请选择宠物',
				icon: 'none'
			})
			return
		}

		try {
			wx.showLoading({
				title: '发布中...'
			})

			// 先上传媒体文件
			// 上传图片
			let images = [];
			let mediaList= this.data.mediaList;
			let mediaUrls ="";
			if(mediaList.length>0){
				mediaList.map(i => (
					images.push(i.url)
				))
				mediaUrls = await UploadImages({
					tempFiles: images
				});
			}
			console.log(mediaUrls)
			const petAgeDays = calculatePetAge(this.data.selectedPet.adoptDate || this.data.selectedPet.birthDate)
			const data = {
				content: this.getSubmitContent(),
				mediaUrls: mediaUrls.join(','),
				location: this.data.location,
				moodTag: this.data.selectedTag,
				recordDate: this.data.selectedDate,
				petId: this.data.selectedPet.petId,
				recordType: 2, // 日记类型
				petAgeDays: petAgeDays,
				userId: this.data.userInfo.userId
			}

			const res = await request({
				url: urls.timelinecreate,
				method: 'POST',
				data
			})

			wx.hideLoading()

			if (res.code === 200) {
				// 删除草稿
				if (this.data.draftId) {
					this.deleteDraft()
				}

				wx.showToast({
					title: '发布成功',
					icon: 'success'
				})

				// 跳转到记录详情或返回首页
				setTimeout(() => {
					wx.navigateBack()
				}, 1500)
			}
		} catch (err) {
			console.error('发布失败', err)
			wx.hideLoading()
		}
	},


	// 删除草稿
	async deleteDraft() {
		if (!this.data.draftId) return
		try {
			await request({
				url: `/api/draft/${this.data.draftId}`,
				method: 'DELETE'
			})
		} catch (err) {
			console.error('删除草稿失败', err)
		}
	}
})
