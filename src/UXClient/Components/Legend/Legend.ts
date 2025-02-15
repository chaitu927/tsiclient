import * as d3 from 'd3';
import './Legend.scss';
import {Utils, DataTypes} from "./../../Utils";
import {Component} from "./../../Interfaces/Component";
import { ChartOptions } from '../../Models/ChartOptions';
import { ChartComponentData } from '../../Models/ChartComponentData';

const NUMERICSPLITBYHEIGHT = 44;
const NONNUMERICSPLITBYHEIGHT = 24; 

class Legend extends Component {
    public drawChart: any;
    public legendElement: any;
    public legendWidth: number;
    private chartComponentData: ChartComponentData;

	constructor(drawChart: any, renderTarget: Element, legendWidth: number) {
        super(renderTarget);
        this.drawChart = drawChart;
        this.legendWidth = legendWidth;
        this.legendElement = d3.select(renderTarget).insert("div", ":first-child")
                                .attr("class", "tsi-legend")
                                .style("left", "0px")
                                .style("width", (this.legendWidth) + "px"); // - 16 for the width of the padding
    }

    private labelMouseoutWrapper (labelMouseout, svgSelection) {
        return (svgSelection, aggKey) => {
            d3.event.stopPropagation();
            svgSelection.selectAll(".valueElement")
                        .filter(function () { return !d3.select(this).classed("valueEnvelope"); })
                        .attr("stroke-opacity", 1)
                        .attr("fill-opacity", 1);
            svgSelection.selectAll(".valueEnvelope")
                        .attr("fill-opacity", .2);
            labelMouseout(svgSelection, aggKey);
        }
    }

    private toggleSplitByVisible (aggregateKey: string, splitBy: string)  {
        var newState = !this.chartComponentData.displayState[aggregateKey].splitBys[splitBy].visible;
        this.chartComponentData.displayState[aggregateKey].splitBys[splitBy].visible = newState;
        this.chartComponentData.displayState[aggregateKey].visible = Object.keys(this.chartComponentData.displayState[aggregateKey].splitBys)
                                        .reduce((prev: boolean, curr: string): boolean => {
                                            return this.chartComponentData.displayState[aggregateKey]["splitBys"][curr]["visible"] || prev;
                                        }, false);
    //turn off sticky if making invisible
        if (newState == false && (this.chartComponentData.stickiedKey != null && 
            this.chartComponentData.stickiedKey.aggregateKey == aggregateKey && 
            this.chartComponentData.stickiedKey.splitBy == splitBy)) {
            this.chartComponentData.stickiedKey = null;
        }
    } 

    public triggerSplitByFocus (aggKey: string, splitBy: string) {
        if (this.chartOptions.legend == "hidden") {
            return;
        }
        this.legendElement.selectAll('.tsi-splitByLabel').classed("inFocus", false);
        this.legendElement.selectAll('.tsi-splitByLabel').filter(function (labelData: any) {
            return (d3.select(this.parentNode).datum() == aggKey) && (labelData == splitBy);
        }).classed("inFocus", true);

        var indexOfSplitBy = Object.keys(this.chartComponentData.displayState[aggKey].splitBys).indexOf(splitBy);

        if (indexOfSplitBy != -1) {
            var splitByNode = this.legendElement.selectAll('.tsi-splitByContainer').filter((d) => {
                return d == aggKey;
            }).node();
            var prospectiveScrollTop = Math.max((indexOfSplitBy - 1) * this.getHeightPerSplitBy(aggKey), 0) ;
            if (splitByNode.scrollTop < prospectiveScrollTop - (splitByNode.clientHeight - 40) || splitByNode.scrollTop > prospectiveScrollTop) {
                splitByNode.scrollTop = prospectiveScrollTop;
            }  
        }
    }

    private getHeightPerSplitBy (aggKey) {
        return (this.chartComponentData.displayState[aggKey].dataType === DataTypes.Numeric ? NUMERICSPLITBYHEIGHT : NONNUMERICSPLITBYHEIGHT);
    }

	public draw(legendState, chartComponentData, labelMouseover, svgSelection, options, labelMouseoutAction = null, stickySeriesAction = null) {
        this.chartOptions.setOptions(options);
        this.chartComponentData = chartComponentData;
        var labelMouseout = this.labelMouseoutWrapper(labelMouseoutAction, svgSelection);
        var legend = this.legendElement;
        var self = this;
        
        super.themify(this.legendElement, this.chartOptions.theme);
        
        var toggleSticky = (aggregateKey: string, splitBy: string) => {
            //don't do anything if not visible 
            if (!this.chartComponentData.displayState[aggregateKey].visible ||
                !this.chartComponentData.displayState[aggregateKey].splitBys[splitBy].visible)
                return;
            if (this.chartComponentData.stickiedKey != null && 
                this.chartComponentData.stickiedKey.aggregateKey == aggregateKey && 
                this.chartComponentData.stickiedKey.splitBy == splitBy){
                this.chartComponentData.stickiedKey = null;
            } else {
                if (stickySeriesAction) {
                    stickySeriesAction(aggregateKey, splitBy);
                }
            }
        }

        legend.style('visibility', legendState != 'hidden')
            .classed('compact', legendState == 'compact')
            .classed('hidden', legendState == 'hidden')
            .style('width', legendState == 'hidden' ? '0px' : this.legendWidth + "px");


        let seriesNames = Object.keys(this.chartComponentData.displayState);
        var seriesLabels: any = legend.selectAll(".tsi-seriesLabel")
            .data(seriesNames, d => d);

        var seriesLabelsEntered = seriesLabels.enter()
            .append("div") 
            .merge(seriesLabels)
            .attr("class", (d, i) => {
                return "tsi-seriesLabel " + (this.chartComponentData.displayState[d]["visible"] ? " shown" : "");
            })
            .style("min-width", () => {
                return Math.min(124, this.legendElement.node().clientWidth / seriesNames.length) + 'px';  
            })
            .style("border-color", function (d, i) {
                if (d3.select(this).classed("shown"))
                    return self.chartComponentData.displayState[d].color;
                return "lightgray";
            });

        var self = this;

        const heightPerNameLabel: number = 25;
        const verticalPaddingPerSeriesLabel: number = 16;
        const usableLegendHeight: number = legend.node().clientHeight;
        var prospectiveAggregateHeight = Math.ceil(Math.max(201, (usableLegendHeight / seriesLabelsEntered.size())));
        var contentHeight = 0;

        seriesLabelsEntered.each(function (aggKey: string, i: number) {
            let heightPerSplitBy = self.getHeightPerSplitBy(aggKey);
            var splitByLabelData = Object.keys(self.chartComponentData.timeArrays[aggKey]);
            var noSplitBys: boolean = splitByLabelData.length == 1 && splitByLabelData[0] == "";
            var seriesNameLabel = d3.select(this).selectAll(".tsi-seriesNameLabel").data([aggKey]);
            d3.select(this).classed('tsi-nsb', noSplitBys);
            var enteredSeriesNameLabel = seriesNameLabel.enter().append("button")
                .merge(seriesNameLabel)
                .attr("class", (agg: string, i) => {
                    return "tsi-seriesNameLabel" + (self.chartComponentData.displayState[agg].visible ? " shown" : "");
                }) 
                .attr("aria-label", (agg: string) => {
                    let showOrHide = self.chartComponentData.displayState[agg].visible ? self.getString('hide group') : self.getString('show group');
                    return `${showOrHide} ${self.getString('group')} ${self.chartComponentData.displayState[agg].name}`;
                })   
                .on("click", function (d: string, i: number) {
                    var newState = !self.chartComponentData.displayState[d].visible;
                    self.chartComponentData.displayState[d].visible = newState;

                    //turn off sticky if making invisible
                    if (newState == false && (self.chartComponentData.stickiedKey != null && 
                        self.chartComponentData.stickiedKey.aggregateKey == d)) {
                        self.chartComponentData.stickiedKey = null;
                    }
                    self.drawChart();
                })
                .on("mouseover", (d) => {
                    labelMouseover(d);
                })
                .on("mouseout", (d) => {
                    labelMouseout(svgSelection, d);
                });

            var seriesNameLabelText = enteredSeriesNameLabel.selectAll("h4").data([aggKey]);
            var seriesNameLabelTextEntered = seriesNameLabelText.enter()
                .append("h4")
                .merge(seriesNameLabelText)
                .attr("title", (d: string) => self.chartComponentData.displayState[d].name)
                .text((d: string) => self.chartComponentData.displayState[d].name);

            seriesNameLabelText.exit().remove();
            seriesNameLabel.exit().remove();

            var splitByContainerHeight;
            if (splitByLabelData.length > (prospectiveAggregateHeight / heightPerSplitBy)) {
                splitByContainerHeight = prospectiveAggregateHeight - heightPerNameLabel;
                contentHeight += splitByContainerHeight + heightPerNameLabel;
            } else if (splitByLabelData.length > 1 || (splitByLabelData.length === 1 && splitByLabelData[0] !== "")) {
                splitByContainerHeight = splitByLabelData.length * heightPerSplitBy + heightPerNameLabel;
                contentHeight += splitByContainerHeight + heightPerNameLabel;
            } else {
                splitByContainerHeight = heightPerSplitBy;
                contentHeight += splitByContainerHeight;
            }
            if (self.chartOptions.legend == "shown") {
                d3.select(this).style("height", splitByContainerHeight + "px");
            } else {
                d3.select(this).style("height", "unset");
            }

            var splitByContainer = d3.select(this).selectAll(".tsi-splitByContainer").data([aggKey]);
            var splitByContainerEntered = splitByContainer.enter().append("div")
                .merge(splitByContainer)
                .classed("tsi-splitByContainer", true);


            var renderSplitBys = (dataType = DataTypes.Numeric) => {
                var firstSplitBy = self.chartComponentData.displayState[aggKey].splitBys
                                [Object.keys(self.chartComponentData.displayState[aggKey].splitBys)[0]];
                var firstSplitByType = firstSplitBy ? firstSplitBy.visibleType : null;
                var isSame = Object.keys(self.chartComponentData.displayState[aggKey].splitBys).reduce((isSame: boolean, curr: string) => {
                    return (firstSplitByType == self.chartComponentData.displayState[aggKey].splitBys[curr].visibleType) && isSame;
                }, true);

                var splitByLabels = splitByContainerEntered.selectAll('.tsi-splitByLabel')
                    .data(splitByLabelData.slice(0, self.chartComponentData.displayState[aggKey].shownSplitBys), function (d: string): string {
                        return d;
                    });

                var splitByLabelsEntered = splitByLabels                    
                    .enter()
                    .append("div")
                    .merge(splitByLabels)
                    .attr('role', legendState === 'compact' ? 'button' : 'presentation')
                    .attr('tabindex', legendState === 'compact' ? '0' : '-1')
                    .on('keypress', (splitBy: string) => {
                        if (legendState === 'compact' && (d3.event.keyCode === 13 || d3.event.keyCode === 32)) { //space or enter
                            self.toggleSplitByVisible(aggKey, splitBy);
                            self.drawChart();
                            d3.event.preventDefault();
                        }
                    })
                    .on("click", function (splitBy: string, i: number) {
                        if (legendState == "compact") {
                            self.toggleSplitByVisible(aggKey, splitBy);
                        } else {
                            toggleSticky(aggKey, splitBy);
                        }
                        self.drawChart();
                    })
                    .on("mouseover", function(splitBy: string, i: number) {
                        d3.event.stopPropagation();
                        labelMouseover(aggKey, splitBy);
                    })
                    .on("mouseout", function(splitBy: string, i: number) {
                        d3.event.stopPropagation();
                        svgSelection.selectAll(".valueElement")
                                    .attr("stroke-opacity", 1)
                                    .attr("fill-opacity", 1);
                        labelMouseout(svgSelection, aggKey);
                    })
                    .attr("class", (splitBy, i) => {
                        let compact = (dataType !== DataTypes.Numeric) ? 'tsi-splitByLabelCompact' : '';
                        let shown = Utils.getAgVisible(self.chartComponentData.displayState, aggKey, splitBy) ? 'shown' : ''; 
                        return `tsi-splitByLabel tsi-splitByLabel ${compact} ${shown}`;
                    })
                    .classed("stickied", (splitBy, i) => {
                        if (self.chartComponentData.stickiedKey != null) {
                            return aggKey == self.chartComponentData.stickiedKey.aggregateKey && splitBy == self.chartComponentData.stickiedKey.splitBy;
                        }
                    });

                var colors = Utils.createSplitByColors(self.chartComponentData.displayState, aggKey, self.chartOptions.keepSplitByColor);

                splitByLabelsEntered.each(function (splitBy, j) {
                    let color = (self.chartComponentData.isFromHeatmap) ? self.chartComponentData.displayState[aggKey].color : colors[j];
                    if (dataType === DataTypes.Numeric) {
                        let colorKey = d3.select(this).selectAll('.tsi-colorKey').data([color]);
                        colorKey.enter()
                            .append("div")
                            .attr("class", 'tsi-colorKey')
                            .merge(colorKey)
                            .style('background-color', (d) => {
                                return d;
                            });
                        colorKey.exit().remove();    
                    } else {
                        d3.select(this).selectAll('.tsi-colorKey').remove();
                    }

                    if (d3.select(this).select('.tsi-eyeIcon').empty()) {
                        d3.select(this).append("button")
                            .attr("class", "tsi-eyeIcon")
                            .attr('aria-label', () => {
                                let showOrHide = self.chartComponentData.displayState[aggKey].splitBys[splitBy].visible ? self.getString('hide series') : self.getString('show series');            
                                return `${showOrHide} ${splitBy} ${self.getString('in group')} ${self.chartComponentData.displayState[aggKey].name}`;

                            })
                            .on("click", function (data: any, i: number) {
                                d3.event.stopPropagation();
                                self.toggleSplitByVisible(aggKey, splitBy);
                                d3.select(this)
                                    .classed("shown", Utils.getAgVisible(self.chartComponentData.displayState, aggKey, splitBy));
                                self.drawChart();
                            });    
                    }

                    if (d3.select(this).select('.tsi-seriesName').empty()) {
                        d3.select(this)
                            .append('div')
                            .attr('class', 'tsi-seriesName')
                            .text(d => (noSplitBys ? (self.chartComponentData.displayState[aggKey].name): splitBy));      
                    }

                    if (dataType === DataTypes.Numeric) {
                        if (d3.select(this).select('.tsi-seriesTypeSelection').empty()) {
                            d3.select(this).append("select")
                                .attr('aria-label', `${self.getString("Series type selection for")} ${splitBy} ${self.getString('in group')} ${self.chartComponentData.displayState[aggKey].name}`)
                                .attr('class', 'tsi-seriesTypeSelection')
                                .on("change", function (data: any) {
                                    var seriesType: any = d3.select(this).property("value");
                                    self.chartComponentData.displayState[aggKey].splitBys[splitBy].visibleType = seriesType; 
                                    self.drawChart();
                                })
                                .on("click", () => {
                                    d3.event.stopPropagation();
                                });
                        }
                        d3.select(this).select('.tsi-seriesTypeSelection')
                            .each(function (d) {
                                var typeLabels = d3.select(this).selectAll('option')
                                .data(data => self.chartComponentData.displayState[aggKey].splitBys[splitBy].types.map( (type) => {
                                    return {
                                        type: type,
                                        aggKey: aggKey,
                                        splitBy: splitBy,
                                        visibleMeasure: Utils.getAgVisibleMeasure(self.chartComponentData.displayState, aggKey, splitBy)
                                    }
                                }));
    
                                typeLabels
                                    .enter()
                                    .append("option")
                                    .attr("class", "seriesTypeLabel")
                                    .merge(typeLabels)
                                    .property("selected", (data: any) => {
                                        return ((data.type == Utils.getAgVisibleMeasure(self.chartComponentData.displayState, data.aggKey, data.splitBy)) ? 
                                                " selected" : "");
                                    })                           
                                    .text((data: any) => data.type);
                                typeLabels.exit().remove();
                            });
                    } else {
                        d3.select(this).selectAll('.tsi-seriesTypeSelection').remove();
                    }
                });
                splitByLabels.exit().remove();

                return [splitByContainer, splitByContainerEntered];
            }
            let dataType = self.chartComponentData.displayState[aggKey].dataType;
            var sBs = renderSplitBys(dataType);
            var splitByContainer = sBs[0];
            var splitByContainerEntered = sBs[1];
            splitByContainerEntered.on("scroll", function () {
                if (self.chartOptions.legend == "shown") {
                    if ((<any>this).scrollTop + (<any>this).clientHeight + 40 > (<any>this).scrollHeight) {
                        const oldShownSplitBys = self.chartComponentData.displayState[aggKey].shownSplitBys; 
                        self.chartComponentData.displayState[aggKey].shownSplitBys = Math.min(oldShownSplitBys + 20, splitByLabelData.length);
                        if (oldShownSplitBys != self.chartComponentData.displayState[aggKey].shownSplitBys) {
                            renderSplitBys(dataType);
                        }
                    }    
                }
            });
            splitByContainer.exit().remove();
            d3.select(this).on('scroll', function () {
                if (self.chartOptions.legend == "compact") {
                    if ((<any>this).scrollLeft + (<any>this).clientWidth + 40 > (<any>this).scrollWidth) {
                        const oldShownSplitBys = self.chartComponentData.displayState[aggKey].shownSplitBys; 
                        self.chartComponentData.displayState[aggKey].shownSplitBys = Math.min(oldShownSplitBys + 20, splitByLabelData.length);
                        if (oldShownSplitBys != self.chartComponentData.displayState[aggKey].shownSplitBys) {
                            renderSplitBys(dataType);                   
                        }
                    }    
                }
            });

        });

        if (this.chartOptions.legend == 'shown') {
            var legendHeight = legend.node().clientHeight;
            //minSplitBysForFlexGrow: the minimum number of split bys for flex-grow to be triggered 
            if (contentHeight < usableLegendHeight) {
                this.legendElement.classed("tsi-flexLegend", true);
                seriesLabelsEntered.each(function (d) {
                    let heightPerSplitBy = self.getHeightPerSplitBy(d);
                    var minSplitByForFlexGrow = (prospectiveAggregateHeight - heightPerNameLabel) / heightPerSplitBy;

                    var splitBysCount = Object.keys(self.chartComponentData.displayState[String(d3.select(this).data()[0])].splitBys).length;
                    if (splitBysCount > minSplitByForFlexGrow) {
                        d3.select(this).style("flex-grow", 1);
                    }
                });
            } else {
                this.legendElement.classed("tsi-flexLegend", false);
            }
        }

        seriesLabels.exit().remove();
	}
}

export {Legend}