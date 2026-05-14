// milestone.js
const app = getApp()
const {
	request
} = require('../../../utils/request')
const {
	formatTime,
	calculatePetAge,
	UploadImages,
	calculatePetAgeFormat
} = require('../../../utils/util')
const urls = require('../../../utils/api')
Page({
	data: {
		// 里程碑类型
		milestoneType: 'preset',
		selectedPreset: '',
		customName: '',
		selectedIcon: '⭐',

		// 预设里程碑
		presetMilestones: [{
				value: 'first_bath',
				name: '第一次洗澡',
				icon: '🛁'
			},
			{
				value: 'first_walk',
				name: '第一次出门',
				icon: '🚶'
			},
			{
				value: 'first_train',
				name: '学会技能',
				icon: '🎯'
			},
			{
				value: 'first_vet',
				name: '第一次看病',
				icon: '💉'
			},
			{
				value: 'first_groom',
				name: '第一次美容',
				icon: '✂️'
			},
			{
				value: 'first_birthday',
				name: '生日',
				icon: '🎂'
			},
			{
				value: 'first_friend',
				name: '交到朋友',
				icon: '🐾'
			},
			{
				value: 'first_beach',
				name: '去海边',
				icon: '🏖'
			},
			{
				value: 'first_camping',
				name: '露营',
				icon: '⛺'
			},
			{
				value: 'first_park',
				name: '去公园',
				icon: '🌳'
			},
			{
				value: 'first_trim',
				name: '剪毛',
				icon: '💇'
			},
			{
				value: 'first_trip',
				name: '旅行',
				icon: '✈️'
			}
		],

		// 图标选项
		iconOptions: ['⭐', '🏆', '🎖', '🎗', '🌟', '✨', '💫', '🎊', '🎉', '🎈', '❤️', '💖'],

		// 日期
		selectedDate: '',

		// 宠物
		petList: [],
		selectedPet: null,
		petAgeAtDate: '',

		// 媒体
		mediaList: [],

		// 备注
		remark: '',

		// 弹窗控制
		showDatePickerModal: false,
		showPetPickerModal: false,
		showMediaPickerModal: false,
		canSave: false,
		// 日期选择器数据
		years: [],
		months: [],
		days: [],
		datePickerValue: [0, 0, 0],
		// 编辑的里程碑ID
		milestoneId: null
	},

	onLoad(options) {
		this.initData()

		// 如果是编辑模式
		if (options.milestoneId) {
			this.setData({
				milestoneId: options.milestoneId
			})
			this.loadMilestone(options.milestoneId)
		}

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

		// 生成年份（前后15年）
		for (let i = now.getFullYear() - 15; i <= now.getFullYear(); i++) {
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
			days,
			datePickerValue: [15, now.getMonth(), now.getDate() - 1]
		})
	},

	// 获取宠物列表
	async getPetList() {
		if (!this.data.userInfo) return
		const result = await app.refreshPetList(this.data.userInfo.userId)
		if (result) {
			const petId = wx.getStorageSync('petId')
			const currentPet = result.petList.find(p => p.petId === petId) || result.petList[0]
			this.setData({
				petList: result.petList,
				selectedPet: currentPet
			})
			if (currentPet) {
				this.calculatePetAge()
			}
		}
	},

	// 加载里程碑
	async loadMilestone(milestoneId) {
		try {
			wx.showLoading({
				title: '加载中...'
			})

			const res = await request({
				url: `/api/milestone/${milestoneId}`,
				method: 'GET'
			})

			if (res.code === 0 && res.data) {
				const milestone = res.data
				const selectedPet = this.data.petList.find(p => p.petId === milestone.petId)

				this.setData({
					milestoneType: milestone.isCustom ? 'custom' : 'preset',
					selectedPreset: milestone.isCustom ? '' : milestone.type,
					customName:  milestone.milestoneName || '',
					selectedIcon: milestone.milestoneType || '⭐',
					selectedDate: milestone.milestoneDate,
					selectedPet,
					mediaList: milestone.mediaUrls || [],
					remark: milestone.description || ''
				})

				if (selectedPet) {
					this.calculatePetAge()
				}
			}

			wx.hideLoading()
		} catch (err) {
			console.error('加载里程碑失败', err)
			wx.hideLoading()
		}
	},

	// 切换类型
	switchType(e) {
		const type = e.currentTarget.dataset.type
		this.setData({
			milestoneType: type
		})
	},

	// 选择预设里程碑
	selectPreset(e) {
		const item = e.currentTarget.dataset.item
		this.setData({
			selectedPreset: this.data.selectedPreset === item.name ? '' : item.name,
			selectedIcon: item.icon
		})
		this.checkCanPublish();
	},

	// 自定义名称输入
	onCustomNameInput(e) {
		this.setData({
			customName: e.detail.value
		})
		this.checkCanPublish();
	},

	// 选择图标
	selectIcon(e) {
		const icon = e.currentTarget.dataset.icon
		this.setData({
			selectedIcon: icon
		})
	},

	// 计算里程碑时的宠龄
	calculatePetAge() {
		if (!this.data.selectedPet || !this.data.selectedDate) return

		const pet = this.data.selectedPet
		const baseDate = pet.adoptDate || pet.birthDate

		if (baseDate) {
			const age = calculatePetAgeFormat(baseDate, this.data.selectedDate)
			this.setData({
				petAgeAtDate: age,
				petName: pet.name
			})
		}
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
		this.calculatePetAge()
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
		this.calculatePetAge()
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
				}
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

	// 备注输入
	onRemarkInput(e) {
		this.setData({
			remark: e.detail.value
		})
	},
	// 检查是否可以发布
	checkCanPublish() {
		let canSave = true;
		if (this.data.milestoneType === 'preset' && !this.data.selectedPreset) {
			canSave = false;
		}
		if (this.data.milestoneType === 'custom' && !this.data.customName) {
			canSave = false;
		}
		this.setData({
			canSave
		})
	},

	// 取消
	onCancel() {
		wx.navigateBack()
	},

	// 保存
	async onSave() {
		// 验证
		if (!this.data.selectedPet) {
			wx.showToast({
				title: '请选择宠物',
				icon: 'none'
			})
			return
		}

		if (this.data.milestoneType === 'preset' && !this.data.selectedPreset) {
			wx.showToast({
				title: '请选择里程碑类型',
				icon: 'none'
			})
			return
		}

		if (this.data.milestoneType === 'custom' && !this.data.customName) {
			wx.showToast({
				title: '请输入里程碑名称',
				icon: 'none'
			})
			return
		}

		try {
			wx.showLoading({
				title: '保存中...'
			})
			let mediaList = this.data.mediaList;
			let images = [];
			mediaList.map(i => (
				images.push(i.url)
			))
			let mediaUrls ="";
			if(images.length>0){
				// 上传媒体
				mediaUrls = await UploadImages({tempFiles: images});
			}
			

			let 	milestoneType = this.data.selectedIcon;
			let  milestoneName= "";
			if(this.data.milestoneType === 'preset'){
				milestoneName= this.data.selectedPreset;
			} else  if(this.data.milestoneType === 'custom'){
				milestoneName= this.data.customName
			}
			// 构建数据
			const data = {
				petId: this.data.selectedPet.petId,
				milestoneDate: this.data.selectedDate,
				milestoneType:milestoneType, 
				milestoneName: milestoneName,
				mediaUrls: mediaUrls.join(','),
				description: this.data.remark,
			}

			let res
			if (this.data.milestoneId) {
				res = await request({
					url: `/api/milestone/${this.data.milestoneId}`,
					method: 'PUT',
					data
				})
			} else {
				res = await request({
					url: urls.createmilestone,
					method: 'POST',
					data
				})
			}

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
})