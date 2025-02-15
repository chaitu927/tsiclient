import * as d3 from 'd3';
import './Heatmap.scss';
import {Utils} from "./../../Utils";
import {Component} from "./../../Interfaces/Component";
import { Legend } from '../Legend/Legend';
import { HeatmapCanvas} from '../HeatmapCanvas/HeatmapCanvas';
import { ChartOptions } from '../../Models/ChartOptions';
import { AggregateExpression } from '../../Models/AggregateExpression';
import { ChartDataOptions } from '../../Models/ChartDataOptions';
import { EllipsisMenu } from '../EllipsisMenu/EllipsisMenu';
import { TemporalXAxisComponent } from '../../Interfaces/TemporalXAxisComponent';

class Heatmap extends TemporalXAxisComponent {
    private lineHeight = 12;
    private splitByLabelWidth = 140;
    private heatmapWrapper: any;
    private splitByLabels: any;
    private legend: Legend;
    public draw: any;
    private heatmapCanvasMap: any;
    private timeLabels: any = null;
    private height: number;
    private timeLabelsHeight = 52;
    private svgSelection = null;
    private visibleAggs = null;

    public chartMargins: any = {        
        top: 0,
        bottom: 8,
        left: 40, 
        right: 20
    };

    private focusOnEllipsis () {
        if (this.ellipsisContainer !== null) {
            this.ellipsisContainer.select(".tsi-ellipsisButton").node().focus();
        }
    }

    private createControlsPanel () {
        this.chartControlsPanel = Utils.createControlPanel(this.renderTarget, this.CONTROLSWIDTH, 52, this.chartOptions);
        this.ellipsisContainer = this.chartControlsPanel.append("div")
            .attr("class", "tsi-ellipsisContainerDiv");
        this.ellipsisMenu = new EllipsisMenu(this.ellipsisContainer.node());
    }

    private chartControlsExist () {
        return (this.ellipsisItemsExist() && !this.chartOptions.hideChartControlPanel);
    }

    private addTimeLabels () {
        if (this.timeLabels === null || this.svgSelection === null) {
            this.svgSelection = this.heatmapWrapper.append('svg')
                .attr('class', 'tsi-heatmapSVG');
            this.timeLabels = this.svgSelection.append('g').attr("class", "tsi-heatmapTimeLabels")
                .attr('transform', 'translate(' + this.chartMargins.left + ',0)');
        }

        if (!this.chartOptions.xAxisHidden) {
            this.xAxis = this.timeLabels.selectAll(".xAxis").data([this.x]);

            this.drawXAxis(this.chartHeight - 60);
            this.xAxis.exit().remove();

            var xAxisBaseline =  this.timeLabels.selectAll(".xAxisBaseline").data([this.x]);
            var xAxisBaselineEntered = xAxisBaseline.enter().append("line")
                .attr("class", "xAxisBaseline")
                .attr("x1", .5)
                .merge(xAxisBaseline)
                .attr("y2", this.chartHeight - (this.chartMargins.bottom + this.timeLabelsHeight))
                .attr("y1", this.chartHeight - (this.chartMargins.bottom + this.timeLabelsHeight))
                .attr("x2", this.chartWidth - 90);
            xAxisBaseline.exit().remove();
        }
        if (this.timeLabels.selectAll(".xAxis").size() !== 0) {
            this.timeLabels.selectAll(".xAxis").style("visibility", ((!this.chartOptions.xAxisHidden) ? "visible" : "hidden"));
        }
    }

    public mouseover = (hoveredAggKey, hoveredSplitBy) => {
        var heatmapCanvas = this.heatmapCanvasMap[hoveredAggKey];
        if (heatmapCanvas)
            heatmapCanvas.render(this.chartComponentData, this.chartOptions, hoveredAggKey, hoveredSplitBy, null, null, null, this.visibleAggs.length === 1);
    }
    public mouseout = (selection, hoveredAggKey) => {
        var heatmapCanvas: HeatmapCanvas = this.heatmapCanvasMap[hoveredAggKey];
        if (heatmapCanvas)
            heatmapCanvas.render(this.chartComponentData, this.chartOptions, hoveredAggKey, null, null, null, null, this.visibleAggs.length === 1);
    }

    public render (data, chartOptions, aggregateExpressionOptions) {
        aggregateExpressionOptions = data.map((d, i) => Object.assign(d, aggregateExpressionOptions && i in aggregateExpressionOptions  ? new ChartDataOptions(aggregateExpressionOptions[i]) : new ChartDataOptions({})));
        // override visibleSplitByCap
        aggregateExpressionOptions = aggregateExpressionOptions.map((aE: AggregateExpression) => {
            return {...aE, visibleSplitByCap : 10000 };
        });
        this.chartOptions.setOptions(chartOptions);
        var targetElement = d3.select(this.renderTarget).classed("tsi-heatmapComponent", true);
		if(targetElement.style("position") == "static")
            targetElement.style("position", "relative");

        this.chartComponentData.mergeDataToDisplayStateAndTimeArrays(data, aggregateExpressionOptions);


        if (this.chartControlsExist() && this.chartControlsPanel === null) {
            this.createControlsPanel();
        } else  if ((this.chartOptions.hideChartControlPanel || !this.ellipsisItemsExist()) && this.chartControlsPanel !== null){
            this.chartControlsPanel.remove();
            this.chartControlsPanel = null;
        }

        if (this.chartControlsExist()) {
            this.chartControlsPanel.style("top", (16 + (this.chartOptions.legend === 'compact' ? 32 : 0)) + 'px');
            this.drawEllipsisMenu();
        }
            
        if (this.heatmapWrapper == null) {
            this.heatmapWrapper = targetElement.append('div')
                .attr("class", "tsi-heatmapWrapper");

            this.draw = () => { 

                this.height = Math.floor(Math.max((<any>d3.select(this.renderTarget).node()).clientHeight, this.MINHEIGHT));        
                this.chartHeight = this.height - ((12 + (this.chartControlsExist() ? 28 : 0) + (this.chartOptions.legend === 'compact' ? 48 : 0)));

                super.themify(targetElement, this.chartOptions.theme);
                this.chartWidth = Math.floor(targetElement.node().getBoundingClientRect().width) - (this.chartOptions.legend == "shown" ? 200 : 0) - (this.chartMargins.left + this.chartMargins.right);

                this.x = d3.scaleTime()
                .rangeRound([0, this.chartWidth - 90]); // HARDCODED to be the width of a heatmapCanvas

                var fromAndTo: any = this.chartComponentData.setAllValuesAndVisibleTAs();
                this.x.domain(fromAndTo);

                this.heatmapWrapper.style("width", this.chartWidth + (this.chartMargins.left + this.chartMargins.right) + "px")
                    .style("height", this.chartHeight + "px")
                    .style("top", (20 + (this.chartControlsExist() ? 36 : 0) + (this.chartOptions.legend === 'compact' ? 40 : 0)) + "px");

                if (this.chartControlsExist()) {
                    let controlPanelWidth = Utils.getControlPanelWidth(this.renderTarget, this.CONTROLSWIDTH, this.chartOptions.legend === 'shown');
                    this.chartControlsPanel.style("width", controlPanelWidth + "px");
                }    

                var canvasWrapperHeightTotal = this.chartHeight - this.timeLabelsHeight - this.chartMargins.bottom;
                this.heatmapCanvasMap = {};
                this.visibleAggs = Object.keys(this.chartComponentData.displayState).filter((aggKey) => {
                    return this.chartComponentData.getAggVisible(aggKey);
                });

                var self = this;
                var canvasWrappers = this.heatmapWrapper.selectAll(".tsi-heatmapCanvasWrapper")
                    .data(this.visibleAggs);
                var canvasesEntered = canvasWrappers.enter()
                    .append("div")
                    .merge(canvasWrappers)
                    .attr("class", "tsi-heatmapCanvasWrapper")
                    .style("width", this.chartWidth + 'px')
                    .style('left', this.chartMargins.left + 'px')
                    .style("height", (d, i) => {
                        return (canvasWrapperHeightTotal * (1 / this.visibleAggs.length)) + "px"
                    })
                    .style("top", (d, i) => {
                        return ((canvasWrapperHeightTotal * (1 / this.visibleAggs.length)) * i) + "px";
                    }).each(function (aggKey, aggI) {
                        var heatmapCanvas = new HeatmapCanvas(this);
                        self.heatmapCanvasMap[aggKey] = heatmapCanvas;
                        var renderHeatmapCanvas = () => {

                            function onCellFocus (focusStartTime, focusEndTime, focusX1, focusX2, focusY, splitBy) {
                                let shiftMillis = self.chartComponentData.getTemporalShiftMillis(aggKey);
                                self.renderTimeLabels(focusStartTime, focusEndTime, focusX1, focusX2, focusY, (aggI * canvasWrapperHeightTotal / self.visibleAggs.length), shiftMillis);
                                self.legend.triggerSplitByFocus(aggKey, splitBy);
                                self.chartOptions.onMouseover(aggKey, splitBy);
                            }

                            heatmapCanvas.render(self.chartComponentData, self.chartOptions, aggKey, null, null, onCellFocus, aggI, self.visibleAggs.length === 1);
                        }
                        renderHeatmapCanvas();         
                    }).on("mouseleave", () => {
                        self.timeLabels.selectAll(".tsi-heatmapTimeLabels").remove();
                        self.legend.legendElement.selectAll('.tsi-splitByLabel').classed("inFocus", false);
                        self.chartOptions.onMouseout();
                    })
                canvasWrappers.exit().remove();

                this.legend.draw(this.chartOptions.legend, this.chartComponentData, this.mouseover, 
                    this.heatmapWrapper, this.chartOptions, this.mouseout);

                //remove all the colorKeys
                this.legend.legendElement.selectAll(".seriesLabel").selectAll(".tsi-splitByLabel").selectAll(".colorKey").style("display", "none");
            }
            this.legend = new Legend(this.draw, this.renderTarget, this.CONTROLSWIDTH);
        }
        this.chartComponentData.mergeDataToDisplayStateAndTimeArrays(data, aggregateExpressionOptions);
        this.draw();
        this.addTimeLabels();
        window.addEventListener("resize", () => {
            if (!this.chartOptions.suppressResizeListener) {
                this.draw();
                this.addTimeLabels();
            }
        });
    }

    public renderTimeLabels = (focusStartTime, focusEndTime, focusX1, focusX2, focusY, yOffset, shiftMillis) => {
        this.timeLabels.selectAll(".tsi-heatmapTimeLabels").remove();
        this.timeLabels.node().parentNode.appendChild(this.timeLabels.node());

        this.timeLabels.append("line").attr("class", "tsi-heatmapFocusLine tsi-heatmapTimeLabels")
            .attr("x1", focusX1)
            .attr("x2", focusX1)
            .attr("y1", focusY + yOffset)
            .attr("y2", this.chartHeight - this.timeLabelsHeight);

        this.timeLabels.append("line").attr("class", "tsi-heatmapFocusLine tsi-heatmapTimeLabels")
            .attr("x1", focusX2)
            .attr("x2", focusX2)
            .attr("y1", focusY + yOffset)
            .attr("y2", this.chartHeight - this.timeLabelsHeight); 
        
        var textBoxG = this.timeLabels.append("g")
            .attr("class", "tsi-heatmapTimeLabelTextBox tsi-heatmapTimeLabels");

        var text = textBoxG.append("text");
        
        text.append("tspan").text(Utils.timeFormat(this.chartComponentData.usesSeconds, this.chartComponentData.usesMillis, 
                 this.chartOptions.offset, this.chartOptions.is24HourTime, shiftMillis, null, this.chartOptions.dateLocale)(focusStartTime))
            .attr("x", 0)
            .attr("y", 16);
        text.append("tspan").text(Utils.timeFormat(this.chartComponentData.usesSeconds, this.chartComponentData.usesMillis, 
                 this.chartOptions.offset, this.chartOptions.is24HourTime, shiftMillis, null, this.chartOptions.dateLocale)(focusEndTime))
            .attr("x", 0)
            .attr("y", 30);

        var textDimensions = text.node().getBoundingClientRect();
        textBoxG.append("rect")
            .attr("x", - (textDimensions.width / 2) - 5)
            .attr("y", 0)
            .attr("height", textDimensions.height + 12)
            .attr("width", textDimensions.width + 10)

        text.node().parentNode.appendChild(text.node());
        var rawOffset = (focusX1 + focusX2) / 2;
        var leftOffset = Math.floor(((rawOffset - ((textDimensions.width / 2) + 6)) > 0) ? rawOffset : ((textDimensions.width / 2) + 6));
        textBoxG.attr("transform", "translate(" + leftOffset + "," + (this.chartHeight - this.timeLabelsHeight - this.chartMargins.bottom) + ")");
    }
}

export {Heatmap}