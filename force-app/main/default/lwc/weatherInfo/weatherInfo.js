import { LightningElement,wire,track } from 'lwc';
import GetWeather from '@salesforce/apex/NewsClass.GetWeather';
import FORM_FACTOR from '@salesforce/client/formFactor';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
export default class WeatherInfo extends LightningElement {
    @track WeatherData=[];
    @track error;
    @track load=false;
    @track AR='';
    @track Dup;
    @track ModalReady=false;
    @track ModalData={};
    SelectedDate;
    colorslist = ['#FFEFEF','#F0EBE3','#B2C8BA','#F3FDE8','#FFF6BD','#FAF8F1'];
    GetArea(event){
        this.AR=event.target.value;
        this.Dup=this.AR.replace(/ /gi,"%20");
        
    }

    showToast(title,msg,varient) {
        const event = new ShowToastEvent({
            title: title,
            message: msg,
            variant: varient,
            mode: 'dismissable'
        });
        this.dispatchEvent(event);
    }

    async Weather(){
        console.log('called...',this.Dup);
        this.load=true;
        this.WeatherData=[];
        await GetWeather({Area:this.Dup})
        .then(result=>{
            if(result == null){
                this.showToast('Error','Please enter valid location','error');
                this.load = false;
                return;
            }
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            console.log('forcast1',result.forecast.forecastday);
           const tempForecast = result.forecast.forecastday.map(i=>({
                ...JSON.parse(JSON.stringify(i)),
                dayOfWeek: days[new Date(i.date).getDay()]
            }))
            console.log('tempForecast (modified):', tempForecast);
            const tempFullForecast = {...result.forecast,forecastday:JSON.parse(JSON.stringify(tempForecast))};
            console.log('forcast',tempFullForecast);
            this.WeatherData = [...this.WeatherData,{...result,forecast:tempFullForecast}];
            console.log('dayofWeek',this.WeatherData[0].forecast.forecastday[0].dayOfWeek);
        })
        .catch(error => {
            this.error=error;
            console.log(this.error);
        });
        this.load=false;
    }

    async GetLocation() {
        if (navigator.geolocation) {
            try {
                this.load= true;
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });

                const loc1 = position.coords.latitude;
                const loc2 = position.coords.longitude;
                this.Dup = `${loc1},%20${loc2}`;

                console.log('Location:', this.Dup);
                localStorage.setItem('coords',this.Dup);

                await this.Weather(); // Now runs after Dup is properly set
                this.AR = "";
                this.load= false;

            } catch (error) {
                this.showToast('Please enable location','','error');
                console.error('Error getting location:', error);
                this.load= false;
            }
        } else {
            this.showToast('Geolocation not supported.','','error');
            console.warn('Geolocation not supported.');
        }
    }


    async connectedCallback(){
        if(localStorage.getItem('coords')){
            this.Dup = localStorage.getItem('coords');
        }
        else{
            this.Dup = await this.getIPAddress();
        }
        await this.Weather();
    }

    renderedCallback(){
        let grids = this.template.querySelectorAll('.weather-item');
        grids.forEach((i,j) => {
            i.style.backgroundColor = this.colorslist[j];
        })
    }

    async getIPAddress() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();

            console.log("Latitude:", data.latitude);
            console.log("Longitude:", data.longitude);

            const coords = `${data.latitude},%20${data.longitude}`;
            console.log('IP Coords:', coords);

            return coords || 'London';
        } catch (error) {
            console.error("Error fetching IP location:", error);
            return 'London';
        }
    }


    ShowModal(event){
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        let temp=[];
        this.ModalReady=true;
        let D=event.target.dataset.value;
        this.SelectedDate = `${days[new Date(D).getDay()]} [${D}]`;
        console.log(D);
        this.WeatherData.forEach(i => {
            i.forecast.forecastday.forEach(j =>{
                if(D===j.date){
                    j.hour.forEach((k,index) =>{
                        temp.push({xdate:k.time.split(' ')[0],xtime:k.time.split(' ')[1],...k});
                    })
                    this.ModalData = temp;
                }
            });
        });
    }
    CloseModal(){
        this.ModalReady=false;
    }
    get CMPSize (){
        switch(FORM_FACTOR) {
            case 'Large':
            return 6;
            case 'Medium':
            return 4;
            case 'Small':
            return 12;
            default:
        }
    }
    get CMPDevice (){
        switch(FORM_FACTOR) {
            case 'Small':
            return false;
            default:
            return true
        }
    }
}