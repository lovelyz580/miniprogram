const env = __wxConfig.envVersion;
console.log('>>> envVersion: ', env);
const baseApi = {
	// develop: "http://localhost:8080/api/",
	develop: "https://wx.lovevivian.com/api/",
	trial: "https://wx.lovevivian.com/api/",
	release: "https://wx.lovevivian.com/api/"
};
var baseUrl = baseApi[env] || 'https://wx.lovevivian.com/';
//api地址
function url() {

	this.imgUrl = "https://img.lovevivian.com/";
	// this.baseUrl = "http://localhost:8080";
	//LMM
	this.getUserInfo = baseUrl + "wechat/wx_login.do";


	
	this.loginByWechat = baseUrl + "user/wx_login.do";
	
	this.getPetlist = baseUrl + "wechat/loginByWechat.do";
	this.timelinelist = baseUrl + "timeline/list";
	this.timelinecreate = baseUrl + "timeline/create";
	this.upload = baseUrl + "common/upload";
	this.updateUserAvatarUrl = baseUrl + "user/updateUserAvatarUrl.do";
	this.addPet = baseUrl + "pet/add";
	this.PetList = baseUrl + "pet/list";
	this.PetOne = baseUrl + "pet/detail";
	this.editSave = baseUrl + "pet/edit";
	this.createmilestone = baseUrl + "pawprint/createmilestone";
	this.todayquestion = baseUrl + "daily-question/today";
	this.randomquestion = baseUrl + "daily-question/random";
	this.answerquestion = baseUrl + "daily-question/answer";
	this.statsquestion = baseUrl + "daily-question/stats";
	this.recordOne = baseUrl + "timeline/detail";
	this.Milestone = baseUrl + "pawprint/milestone";
	this.recordlist = baseUrl + "timeline/list";

	this.weather = "https://apis.map.qq.com/ws/weather/v1/";
	this.answerhistory = baseUrl + "daily-question/history";
	this.questiondeail = baseUrl + "daily-question/detail";
	this.questioncalendar = baseUrl + "daily-question/calendar";
	//健康
	this.vaccineCount = baseUrl + "health/vaccine/count";
	this.checkupCount = baseUrl + "health/checkup/count";
	this.checkupList = baseUrl + "health/checkup/list";
	this.checkupadd = baseUrl + "health/checkup/add";

	
	this.medicationCount = baseUrl + "health/medication/count";
	this.medicationList = baseUrl + "health/medication/list";
	this.weightCount = baseUrl + "health/weight/count";
	//提醒
	this.reminderList = baseUrl + "reminder/list";
	this.upcoming = baseUrl + "reminder/upcoming";
	//完成提醒
	this.complete = baseUrl + "reminder/complete";
	this.reminder = baseUrl + "reminder";
	
	//体重管理
	this.getWeightList = baseUrl + "health/weight/list";
	this.latestWeight = baseUrl + "health/weight/latest";
	this.Weight = baseUrl + "health/weight";
	this.Medication = baseUrl + "health/medication";
	//用药
	this.Reminder = baseUrl + "reminder";
	this.medicationStatus = baseUrl + "health/medication/stats"; 
	
	this.vaccineStats = baseUrl + "health/vaccine/stats";
	this.vaccineNext = baseUrl + "health/vaccine/next";
	this.vaccineList = baseUrl + "health/vaccine/list";
	this.vaccineAdd = baseUrl + "health/vaccine/add";
}
var urls = new url();
module.exports = urls;