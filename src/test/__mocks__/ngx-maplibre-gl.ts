import { Component, Injectable, Input, Output, EventEmitter } from '@angular/core'

@Component({ selector: 'mgl-map', template: '<ng-content />', standalone: true })
class MapComponent {
  @Input() style: string | object = ''
  @Input() center: [number, number] = [0, 0]
  @Input() zoom: [number] = [0]
  @Output() mapLoad = new EventEmitter()
  @Output() zoomEnd = new EventEmitter()
  @Output() zoomChange = new EventEmitter()
}

@Component({ selector: 'mgl-marker', template: '<ng-content />', standalone: true })
class MarkerComponent {
  @Input() lngLat: [number, number] = [0, 0]
}

@Component({ selector: 'mgl-popup', template: '<ng-content />', standalone: true })
class PopupComponent {
  @Input() lngLat: [number, number] = [0, 0]
  @Input() closeOnClick = true
  @Output() popupClose = new EventEmitter()
}

@Component({ selector: 'mgl-layer', template: '', standalone: true })
class LayerComponent {
  @Input() id = ''
  @Input() type = ''
  @Input() source: string | object = ''
  @Input() layout: object = {}
  @Input() paint: object = {}
}

@Component({ selector: 'mgl-geojson-source', template: '', standalone: true })
class GeoJSONSourceComponent {
  @Input() id = ''
  @Input() data: object = {}
}

@Injectable()
class MapService {
  fitBounds = jest.fn()
}

export {
  MapComponent,
  MarkerComponent,
  PopupComponent,
  LayerComponent,
  GeoJSONSourceComponent,
  MapService,
}
