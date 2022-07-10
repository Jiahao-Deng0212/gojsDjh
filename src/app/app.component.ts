/**
 * Sample app showcasing gojs-angular components
 * For use with gojs-angular version 2.x
 */

import { ChangeDetectorRef, Component, ViewChild, ViewEncapsulation } from '@angular/core';
import * as go from 'gojs';
import { GraphLinksModel, GraphObject } from 'gojs';
import { DataSyncService, DiagramComponent, PaletteComponent } from 'gojs-angular';
import produce from "immer";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.ShadowDom
})
export class AppComponent {

  @ViewChild('myDiagram', { static: true }) public myDiagramComponent: DiagramComponent;
  @ViewChild('myPalette', { static: true }) public myPaletteComponent: PaletteComponent;

  // Big object that holds app-level state data
  // As of gojs-angular 2.0, immutability is expected and required of state for ease of change detection.
  // Whenever updating state, immutability must be preserved. It is recommended to use immer for this, a small package that makes working with immutable data easy.
  public state = {
    diagramNodeData: [
      { id: 'Alpha', text: "Alpha", color: 'lightblue', loc: "0 0" },
      { id: 'Beta', text: "Beta", color: 'orange', loc: "100 0" },
      { id: 'Gamma', text: "Gamma", color: 'lightgreen', loc: "0 100" },
      { id: 'Delta', text: "Delta", color: 'pink', loc: "100 100" }
    ],
    diagramLinkData: [
      { key: -1, from: 'Alpha', to: 'Beta' },
      { key: -2, from: 'Alpha', to: 'Gamma' },
      { key: -3, from: 'Beta', to: 'Beta' },
      { key: -4, from: 'Gamma', to: 'Delta' },
      { key: -5, from: 'Delta', to: 'Alpha' }
    ],
    diagramModelData: { prop: 'value' },
    skipsDiagramUpdate: false,
    selectedNodeData: null, // used by InspectorComponent

    // Palette state props
    paletteNodeData: [
      { id: 'Epsilon', text: 'Epsilon', color: 'red' },
      { id: 'Kappa', text: 'Kappa', color: 'purple' }
    ],
    paletteModelData: { prop: 'val' }
  };

  public diagramDivClassName: string = 'myDiagramDiv';
  public paletteDivClassName = 'myPaletteDiv';

  // initialize diagram / templates
  public initDiagram(): go.Diagram {

    const $ = go.GraphObject.make;
    const dia = $(go.Diagram, {
      'undoManager.isEnabled': true,
      model: $(go.GraphLinksModel,
        {
          nodeKeyProperty: 'id',
          linkToPortIdProperty: 'toPort',
          linkFromPortIdProperty: 'fromPort',
          linkKeyProperty: 'key'
        }
      )
    });

    const makePort = function (id: string, spot: go.Spot) {
      return $(go.Shape, 'Circle',
        {
          opacity: .5,
          fill: 'gray', strokeWidth: 0, desiredSize: new go.Size(8, 8),
          portId: id, alignment: spot,
          fromLinkable: true, toLinkable: true
        }
      );
    }

    // define the Node template
    dia.nodeTemplate =
      $(go.Node, 'Spot',
        // {
        //   contextMenu:
        //     $('ContextMenu',
        //       $('ContextMenuButton',
        //         $(go.TextBlock, 'Group'),
        //         { click: function (e, obj) { e.diagram.commandHandler.groupSelection(); } },
        //         new go.Binding('visible', '', function (o) {
        //           return o.diagram.selection.count > 1;
        //         }).ofObject())
        //     ),
        // },
        new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
        $(go.Panel, 'Auto',
          $(go.Shape, 'RoundedRectangle', { stroke: null },
            new go.Binding('fill', 'color', (c, panel) => {
              return c;
            })
          ),
          $(go.TextBlock, { margin: 8, editable: true },
            new go.Binding('text').makeTwoWay()),
        ),
        // Ports
        makePort('t', go.Spot.TopCenter),
        makePort('l', go.Spot.Left),
        makePort('r', go.Spot.Right),
        makePort('b', go.Spot.BottomCenter)
      );

    //---------------------------------------------------------模板-------------------------------------------------------
    // TODO 添加链接模板
    dia.linkTemplate =
      $(go.Link,
        $(go.Shape, {
          strokeWidth: 10
        }),
        $(go.Shape, { toArrow: 'Standard', strokeWidth: 10 }),
        $(go.Panel, 'Auto',
          $(go.Shape, 'Ellipse',
            { width: 30, height: 30, fill: 'whitesmoke', stroke: 'whitesmoke', name: 'addNodeLabel' },
          ),
          // TODO 替换成ui设计图
          $(go.Shape, 'Ellipse',
            { width: 20, height: 20, fill: 'green' }
          ),
          {
            // *** 事件响应 ***
            mouseDragEnter: (e, obj) => {
              let shape = obj.findBindingPanel();
              (shape.findObject('addNodeLabel') as any).fill = 'lightGray'
            },
            mouseDragLeave: (e, obj) => {
              let shape = obj.findBindingPanel();
              (shape.findObject('addNodeLabel') as any).fill = 'whitesmoke'
            },
            mouseDrop: (e, obj) => {
              let that = this;
              setTimeout(() => {
                // 被插入点所在的路径信息
                // TODO() 插入方法需要改进， 理由：视图数据改变，但是模型没有同步更改
                let linkInfo = obj['bg']['jb'];
                let copy_linkInfo = JSON.parse(JSON.stringify(linkInfo))
                let fromNode = dia.model.findNodeDataForKey(linkInfo.from);
                let toNode = dia.model.findNodeDataForKey(linkInfo.to);
                dia.model.commit(function (m) {
                  if ((m as GraphLinksModel).getToKeyForLinkData(linkInfo) === linkInfo.to) {
                    (m as GraphLinksModel).setToKeyForLinkData(linkInfo, window['insertNode'].id)
                  }
                  (dia.model as any as go.GraphLinksModel).addLinkData({ from: linkInfo.to, to: copy_linkInfo.to });
                })
                // (dia.model as any as go.GraphLinksModel).addLinkData({ from: linkInfo.from, to: window['insertNode'].id });
                // (dia.model as any as go.GraphLinksModel).addLinkData({ from: window['insertNode'].id, to: linkInfo.to });
                // (dia.model as any as go.GraphLinksModel).removeLinkData(linkInfo);
                // (dia.model as any as go.GraphLinksModel).mergeLinkDataArray(dia.model['linkDataArray']);

                console.log('---------------');
                // that['linkDataArray'] = dia.model['linkDataArray'];
                console.log(that['nodeDataArray'], that['linkDataArray'], "this对象");
                console.log(dia.model.nodeDataArray, dia.model['linkDataArray'], "dia对象");

              }, 0);
            }
          }
        )

      )

    return dia;
  }

  // When the diagram model changes, update app data to reflect those changes. Be sure to use immer's "produce" function to preserve immutability
  public diagramModelChange = function (changes: go.IncrementalData) {
    console.log(changes);

    if (!changes) return;
    if (changes.insertedNodeKeys && changes.insertedNodeKeys.length > 0) {
      window['insertNode'] = changes.modifiedNodeData && changes.modifiedNodeData.length > 0 ? changes.modifiedNodeData[0] : {};
      // window['insertNode'].key = changes.insertedNodeKeys && changes.insertedNodeKeys.length > 0 ? changes.insertedNodeKeys[0] : {};
    }

    const appComp = this;
    // draf 代表 this.state?
    this.state = produce(this.state, draft => {
      // set skipsDiagramUpdate: true since GoJS already has this update
      // this way, we don't log an unneeded transaction in the Diagram's undoManager history
      draft.skipsDiagramUpdate = true;
      draft.diagramNodeData = DataSyncService.syncNodeData(changes, draft.diagramNodeData, appComp.observedDiagram.model);
      draft.diagramLinkData = DataSyncService.syncLinkData(changes, draft.diagramLinkData, appComp.observedDiagram.model);
      draft.diagramModelData = DataSyncService.syncModelData(changes, draft.diagramModelData);
      // If one of the modified nodes was the selected node used by the inspector, update the inspector selectedNodeData object
      const modifiedNodeDatas = changes.modifiedNodeData;
      if (modifiedNodeDatas && draft.selectedNodeData) {
        for (let i = 0; i < modifiedNodeDatas.length; i++) {
          const mn = modifiedNodeDatas[i];
          const nodeKeyProperty = appComp.myDiagramComponent.diagram.model.nodeKeyProperty as string;
          if (mn[nodeKeyProperty] === draft.selectedNodeData[nodeKeyProperty]) {
            draft.selectedNodeData = mn;
          }
        }
      }
    });
  };

  //  -------------------------------------------------------palette------------------------------------------------------
  public initPalette(): go.Palette {
    const $ = go.GraphObject.make;
    const palette = $(go.Palette);

    // define the Node template
    palette.nodeTemplate =
      $(go.Node, 'Auto',
        $(go.Shape, 'RoundedRectangle',
          {
            stroke: null
          },
          new go.Binding('fill', 'color')
        ),
        $(go.TextBlock, { margin: 8 },
          new go.Binding('text', 'id'))
      );

    palette.model = $(go.GraphLinksModel, {
      nodeKeyProperty: 'id',
      linkKeyProperty: 'key'
    });
    return palette;
  }

  // - -----------------------------------------------------------------------------------------------------------------

  constructor(private cdr: ChangeDetectorRef) { }

  // Overview Component testing
  public oDivClassName = 'myOverviewDiv';
  public initOverview(): go.Overview {
    const $ = go.GraphObject.make;
    const overview = $(go.Overview);
    return overview;
  }
  public observedDiagram = null;

  // currently selected node; for inspector
  public selectedNodeData: go.ObjectData = null;

  public ngAfterViewInit() {
    if (this.observedDiagram) return;
    this.observedDiagram = this.myDiagramComponent.diagram;
    this.cdr.detectChanges(); // IMPORTANT: without this, Angular will throw ExpressionChangedAfterItHasBeenCheckedError (dev mode only)

    const appComp: AppComponent = this;
    // listener for inspector
    this.myDiagramComponent.diagram.addDiagramListener('ChangedSelection', function (e) {
      if (e.diagram.selection.count === 0) {
        appComp.selectedNodeData = null;
      }
      const node = e.diagram.selection.first();
      appComp.state = produce(appComp.state, draft => {
        if (node instanceof go.Node) {
          var idx = draft.diagramNodeData.findIndex(nd => nd.id == node.data.id);
          var nd = draft.diagramNodeData[idx];
          draft.selectedNodeData = nd;
        } else {
          draft.selectedNodeData = null;
        }
      });
    });
  } // end ngAfterViewInit


  /**
   * Update a node's data based on some change to an inspector row's input
   * @param changedPropAndVal An object with 2 entries: "prop" (the node data prop changed), and "newVal" (the value the user entered in the inspector <input>)
   */
  public handleInspectorChange(changedPropAndVal) {

    const path = changedPropAndVal.prop;
    const value = changedPropAndVal.newVal;

    this.state = produce(this.state, draft => {
      var data = draft.selectedNodeData;
      data[path] = value;
      const key = data.id;
      const idx = draft.diagramNodeData.findIndex(nd => nd.id == key);
      if (idx >= 0) {
        draft.diagramNodeData[idx] = data;
        draft.skipsDiagramUpdate = false; // we need to sync GoJS data with this new app state, so do not skips Diagram update
      }
    });
  }

  save() {
    console.log(this.state);


  }

}

