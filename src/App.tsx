import { useCallback, useEffect, useState } from 'react';

interface LocationInfo {
    name: string
    lat: number
    lng: number
}
interface WeatherData {
    daily: {
        time: string[]
        temperature_2m_min: number[]
        temperature_2m_max: number[]
        apparent_temperature_min: number[]
        apparent_temperature_max: number[]
        weathercode: number[]
    }
    daily_units: {
        temperature_2m_min: string
        temperature_2m_max: string
        apparent_temperature_min: string
        apparent_temperature_max: string
    }
    latitude: number
    longitude: number
}

interface WeatherCodeStatus {
    [key: string]: string
}

function findClosestLocation(locations: LocationInfo[], targetLatitude: number, targetLongitude: number): LocationInfo | null {
    let closestLocation: LocationInfo | null = null;
    let closestDistance = Number.MAX_VALUE;

    for (const location of locations) {
        const distance = calculateDistance(location.lat, location.lng, targetLatitude, targetLongitude);
        if (distance < closestDistance) {
            closestLocation = location;
            closestDistance = distance;
        }
    }

    return closestLocation;
}

function calculateDistance(latitude1: number, longitude1: number, latitude2: number, longitude2: number): number {
    const earthRadius = 6371; // Earth's radius in km
    const latDiff = toRadians(latitude2 - latitude1);
    const lonDiff = toRadians(longitude2 - longitude1);
    const a =
        Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
        Math.cos(toRadians(latitude1)) * Math.cos(toRadians(latitude2)) *
        Math.sin(lonDiff / 2) * Math.sin(lonDiff / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadius * c;
    return distance;
}

function toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
}

function App() {

    const [locations, setLocations] = useState<LocationInfo[]>([])
    const [lat, setLat] = useState(-1)
    const [lng, setLng] = useState(-1)
    const [yourLocation, setYourLocation] = useState('')
    const [disableButton, setDisableButton] = useState(false)
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
    const [codeStatus, setCodeStatus] = useState<WeatherCodeStatus | null>(null)

    useEffect(() => {
        import('./country/malaysia.json').then((s) => {
            setLocations(s.default)
        })
        import('./data/weather_code_status.json').then((s) => {
            // console.log('import codeStatus : ', s)
            setCodeStatus(s.default)
        })

    }, [])

    useEffect(() => {
        if (lat === -1 && lng === -1) {
            setYourLocation('Unknown, use GPS first')
        } else {
            const loc = findClosestLocation(locations, lat, lng)
            if (loc)
                setYourLocation(`${loc.name} (${loc.lat} , ${loc.lng})`)

            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min&timezone=auto`)
                .then(res => res.json())
                .then(json => {
                    console.log('received weather data : ', json)
                    setWeatherData(json)
                })
        }
    }, [lat, lng, locations])

    const renderWeatherData = useCallback(() => {
        if (weatherData === null) {
            return <p>Use GPS first</p>
        }
        const renderRows = () => {
            const { daily, daily_units } = weatherData
            const { time, temperature_2m_min, temperature_2m_max, apparent_temperature_min, apparent_temperature_max, weathercode } = daily

            return time.map((time, i) => {
                let weatherStatus = ''
                if (codeStatus) {
                    let codeString = String(weathercode[i])
                    if (codeString.length < 2)
                        codeString = '0' + codeString
                    weatherStatus = codeStatus[codeString]
                }
                return <div key={time} style={{ marginBottom: '8px', marginTop: '8px' }}>
                    <span>{time}</span>
                    <br />
                    <span>{temperature_2m_min[i]}{daily_units.temperature_2m_min} ~ {temperature_2m_max[i]}{daily_units.temperature_2m_max}</span>
                    <br />
                    <span>feels like {apparent_temperature_min[i]}{daily_units.apparent_temperature_min} ~ {apparent_temperature_max[i]}{daily_units.apparent_temperature_max}</span>
                    <br />
                    <span>Weather : {weatherStatus ? weatherStatus : weathercode[i]}</span>
                </div>
                // return <p key={time}>{time} - {temperature_2m_min[i]}{daily_units.temperature_2m_min} ~ {temperature_2m_max[i]}{daily_units.temperature_2m_max} feels like {apparent_temperature_min[i]}{daily_units.apparent_temperature_min} ~ {apparent_temperature_max[i]}{daily_units.apparent_temperature_max}</p>
            })
        }
        return <div id='weatherData'>
            {renderRows()}
        </div>
    }, [weatherData, codeStatus])

    const useGPS = () => {
        setDisableButton(true)
        window.navigator.geolocation.getCurrentPosition((pos) => {
            setLat(pos.coords.latitude)
            setLng(pos.coords.longitude)
            setDisableButton(false)
        }, (e) => {
            alert(`Failed : ${e.message}`)
            setDisableButton(false)
        })
    }

    return (
        <div className="App">
            <a href='https://open-meteo.com/' target='_blank'>Uses weather data from Open-Meteo</a>
            <p>Latitude : {lat}</p>
            <p>Longitude : {lng}</p>
            <p>Approximat location : {yourLocation}</p>
            <button disabled={disableButton} onClick={useGPS}>Use GPS</button>
            {renderWeatherData()}
        </div>
    );
}

export default App;
