import axios from 'axios'
// import cn from 'classnames'
import {useState, useEffect, useMemo, useRef} from 'react'
import './App.scss'

const API_URL = 'http://route-finder-api.local'
// const API_URL = 'https://quiet-bayou-48580.herokuapp.com'

function App() {
  const [routes, setRoutes] = useState([])
  const [myRoutes, setMyRoutes] = useState([])
  const [stops, setStops] = useState([])
  // 
  const [stopA, setStopA] = useState(0)
  const [stopB, setStopB] = useState(0)
  const [customRoute, setCustomRoute] = useState([])
  const fileInput = useRef()

  const myRoutesExpand = useMemo(()=>{
    if(routes.length === 0){
      return []
    }

    return myRoutes
      .map(v=> {
        const _routes = v.map(v2 => routes.find(({id}) => id === v2))
        let title

        if(_routes.length > 1){
          title = _routes.reduce((acc, el) => acc.concat(el.stops.map(({title})=>title).slice(1)), [_routes[0].stops[0].title])
        }else{
          title = _routes[0].stops.map(({title}) => title)
        }

        return {
          title: title.join(' - '),
          distance: _routes.map(({distance})=>distance).reduce((a, b) => a + b, 0)
        }
      })
  }, [routes, myRoutes])

  /**
   * 
   */
  function fetchMyRoutes(){
    axios.get(`${API_URL}/my-routes`).then(r=>setMyRoutes(r.data.map(v=>v.route_id)))
  }

  function fetchStops(){
    return axios.get(`${API_URL}/stops`).then(r=>setStops(r.data))
  }
  
  function fetchRoutes(){
    return axios.get(`${API_URL}/routes`).then(
      r=>{
        setRoutes(
          r.data.map(
            v=>
              {
                v.distance = v.stops.map(({pivot:{distance}})=>distance).reduce((a, b) => a + b, 0)
                return v
              }
          )
        )
      }
    )
  }

  function saveRoute(arr){
    return axios.post(`${API_URL}/my-routes`,{
      route_id: arr
    })
    .then(r=>{
      fetchMyRoutes()
    })
    .catch( (error) => {
      console.error(error);
    })
  }

  /**
   * 
   */
  const directRoute = useMemo(()=>{
    if(stopA && stopB){
      const matched = routes.filter(v=>{
        return v.stops[0].id === stopA && v.stops[v.stops.length - 1].id === stopB
      })

      if(matched.length > 0){
        matched.sort((a,b)=>{
          return a.distance - b.distance;
        })

        return matched
      }
    }

    return []
  },[stopA, stopB, routes])

  const customRouteDistance = useMemo(()=>{
    return customRoute.map(v => v.route ? v.route.distance : 0).reduce((a, b) => a + b, 0)
  }, [customRoute])

  useEffect(()=>{
    if(stopA === stopB || !stopA){
      setStopB(0)
    }
    
    if(stopA && stopB && !directRoute){
      setCustomRoute([{
        routes: routes.filter(v=>v.stops[0].id === stopA)
      }])
    }else{
      setCustomRoute([])
    }
  }, [stopA, stopB, directRoute, routes])

  const addStop = (e, v) => {
    let route = routes.find(v=>v.id === Number(e.target.value))
    let _routes = routes.filter(v=>v.stops[0].id === route.stops[route.stops.length - 1].id)
    v.route = route

    setCustomRoute([
      ...customRoute,
      {
        routes: _routes.length > 0 ? _routes : null
      }
    ])
  }

  const handleSubmit = e => {
    e.preventDefault()

    var formData = new FormData();
    // var imagefile = document.querySelector('#file');
    formData.append("file", fileInput.current.files[0]);

    axios.post(`${API_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }).then(r=>{
      e.target.value = null
      fetchStops()
      fetchRoutes()
    })
  }

  useEffect(()=>{
    fetchStops()
    fetchRoutes()
    fetchMyRoutes()
  },[])
  
  return (
    <div className="App container">
      <header>
        <h1>Route Finder</h1>
        
        <input type="file" ref={fileInput} onChange={handleSubmit} />
      </header>

      <main>
      <label className="S mb-1">
        From:
        <select 
          value={stopA} 
          onChange={e=>setStopA(Number(e.target.value))
        }>
          <option value="0">-</option>
          {stops && stops.map(({id, title})=><option key={id} value={id}>{title}</option>)}
        </select>
      </label>

      {
        <label className="S mb-2">
          To:
          <select
            disabled={!stopA}
            value={stopB} 
            onChange={e=>setStopB(Number(e.target.value))
          }>
            <option value="0">-</option>
            {
              stops.filter(v => v.id !== stopA).map(v=>
                <option key={v.id} value={v.id}>{v.title}</option>
              )
            }
          </select>
        </label>
      }
      
      {
        directRoute.length > 0 &&
        <div className="DR">
          {
            directRoute.map((v, i)=>
              <div 
                key={v.id} 
                className="DR-r" 
                onClick={()=>saveRoute([v.id])}
              >
                <span>{v.stops.map(v=>v.title).join(' - ')}</span> ({v.distance})
              </div>
            )
          }
        </div>
      }

      {
        (stopA > 0 && stopB > 0 && directRoute.length === 0) &&
          <div className="CR">
            <h3>
              No direct route
            </h3>

            {
              customRoute[0]?.routes?.length > 0
              ? 
              <div>
                <div className="CR-r">
                {
                  customRoute.map((v, i)=> v.routes &&
                    <div 
                      className="S" 
                      key={i + '' + v}
                    >
                      <select
                        value={v.route?.id}
                        disabled={v.route} 
                        onChange={e => addStop(e, v)}
                      >
                        <option value="">-</option>
                        {
                          v.routes.map(v=>
                            <option 
                              value={v.id} 
                              key={v.id}
                            >
                              {v.stops.map(v=>v.title).join(' - ')} ({v.distance})
                            </option>
                          )
                        }
                      </select>

                      {
                        v.route?.distance &&
                        <div>
                          {v.route?.distance}
                        </div>
                      }
                    </div>
                  )
                }
                </div>

                {
                  customRouteDistance > 0 &&
                  <div className="ta-c mt-1">
                    Total: {customRouteDistance}
                    <div>
                      <button onClick={()=>saveRoute(customRoute.filter(v=>v.route).map(v=>v.route.id))}>Save</button>
                    </div>
                  </div>
                }
              </div>
              :
              <h3>No detour</h3>
            }

          </div>
      }
      </main>

      <aside>
      {
        myRoutes.length > 0 &&
        <div>
          <h2>My Routes</h2>
          <ol>
            {
              myRoutesExpand.map((v, i)=> 
              <li key={i}>{v.title} ({v.distance})</li>)
            }
          </ol>
        </div>
      }
      </aside>
      
    </div>
  );
}

export default App;
