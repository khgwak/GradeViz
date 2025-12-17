const UI_TEXT = {
    en: {
        title: "Grade Dashboard",
        totalCredits: "Total Credits",
        overallGPA: "Overall GPA",
        majorGPA: "Major GPA",
        convertedScore: "Converted Score",
        gpaTrend: "Semester GPA Graph",
        gradeDist: "Grade Distribution",
        codeDist: "Course Code Distribution",
        creditsPerSem: "Credits by Semester",
        toggleBtn: "한글",
        semester: "Semester",
        gpa: "GPA",
        count: "Count",
        credits: "Credits",
        courseList: "Course List",
        searchPlaceholder: "Search courses...",
        tableHeaders: {
            semester: "Semester ↕",
            code: "Code ↕",
            title: "Course Title ↕",
            category: "Category ↕",
            credits: "Credits ↕",
            grade: "Grade ↕"
        },
        filters: {
            allSemesters: "All Semesters",
            allCategories: "All Categories",
            reset: "Reset"
        },
        legendHint: "Click to focus",
        filterHint: "Click to filter table",
        noResults: "No courses found matching your criteria.",
        filteredStats: {
            credits: "Filtered Credits",
            gpa: "Filtered GPA",
            majorGpa: "Filtered Major GPA"
        },
        scaleToggle40: "Switch to 4.0 Scale",
        scaleToggle43: "Switch to 4.3 Scale"
    },
    ko: {
        title: "성적 대시보드",
        totalCredits: "이수학점",
        overallGPA: "평점평균",
        majorGPA: "전공 평점평균",
        convertedScore: "환산 점수",
        gpaTrend: "학기별 평점평균 그래프",
        gradeDist: "성적 분포",
        codeDist: "과목 코드 분포",
        creditsPerSem: "학기별 이수학점",
        toggleBtn: "English",
        semester: "학기",
        gpa: "평점",
        count: "개수",
        credits: "학점",
        courseList: "수강 과목 목록",
        searchPlaceholder: "강의명 또는 코드로 검색...",
        tableHeaders: {
            semester: "학기 ↕",
            code: "교과목 코드 ↕",
            title: "교과목명 ↕",
            category: "이수구분 ↕",
            credits: "학점 ↕",
            grade: "성적 ↕"
        },
        filters: {
            allSemesters: "전체 학기",
            allCategories: "전체 카테고리",
            reset: "초기화"
        },
        legendHint: "클릭하여 이 그래프만 강조",
        filterHint: "클릭하여 테이블 필터링",
        noResults: "조건에 맞는 강의가 없습니다.",
        filteredStats: {
            credits: "필터된 이수학점",
            gpa: "필터된 평점평균",
            majorGpa: "필터된 전공 평점평균"
        },
        scaleToggle40: "4.0 만점으로 전환",
        scaleToggle43: "4.3 만점으로 전환"
    }
};

let currentLanguage = 'en';
let gpaScale = '4.3';
let courseData = [];

const SEMESTER_ORDER = { "1st": 1, "Summer": 2, "2nd": 3, "Winter": 4 };

let tableState = {
    sortKey: 'semester',
    sortOrder: 'asc',
};

let filterState = {
    term: '',
    semester: 'all',
    category: 'all',
    grade: 'all',
    codePrefix: 'all'
};

const SCALE_4_3 = {
    'A+': 4.3, 'A0': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B0': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C0': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D0': 1.0, 'D-': 0.7,
    'F': 0.0
};

const SCALE_4_0 = {
    'A+': 4.0, 'A0': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B0': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C0': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D0': 1.0, 'D-': 0.7,
    'F': 0.0
};

const CHART_COLORS = {
    total: '#003A70',
    major: '#64CCC9',
    text: '#64748b',
    grid: '#e2e8f0'
};

const CATEGORY_KO = {
    "Basic": "기초",
    "Liberal Arts": "교양",
    "Major": "전공",
    "Minor": "부전공",
    "Internship": "인턴십",
    "Leadership Program": "리더십프로그램",
    "Other": "기타"
};

const CONVERSION_BASE = 57;
const CONVERSION_SLOPE = 10;

function generateGradientColors(count) {
    if (count <= 0) return [];
    if (count === 1) return [CHART_COLORS.major];

    const startColor = d3.color(CHART_COLORS.major);
    const endColor = d3.color(CHART_COLORS.total);
    const interpolator = d3.interpolate(startColor, endColor);

    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(interpolator(i / (count - 1)));
    }
    return colors;
}

function getIsMobile() {
    return document.body.clientWidth < 768;
}

function resetFilters(except = null) {
    if (except !== 'term') {
        filterState.term = '';
        const searchInput = document.getElementById('course-search');
        if (searchInput) searchInput.value = '';
    }
    if (except !== 'semester') {
        filterState.semester = 'all';
        const semSelect = document.getElementById('filter-semester');
        if (semSelect) semSelect.value = 'all';
    }
    if (except !== 'grade') filterState.grade = 'all';
    if (except !== 'codePrefix') filterState.codePrefix = 'all';
    if (except !== 'category') {
        filterState.category = 'all';
        const catSelect = document.getElementById('filter-category');
        if (catSelect) catSelect.value = 'all';
    }
}

function getLocalizedCategoryName(category) {
    if (currentLanguage === 'en') return category;
    return CATEGORY_KO[category] || category;
}

function sortSemesters(semesters) {
    return semesters.sort((a, b) => {
        const [yearA, termA] = a.split(' ');
        const [yearB, termB] = b.split(' ');
        if (yearA !== yearB) return yearA - yearB;
        return SEMESTER_ORDER[termA] - SEMESTER_ORDER[termB];
    });
}

function isRegularSemester(semester) {
    return !semester.includes('Summer') && !semester.includes('Winter');
}

document.addEventListener('DOMContentLoaded', () => {
    loadCourseData();
    initializeEventListeners();
    updateInterfaceText();

    window.addEventListener('resize', debounce(() => {
        renderAllCharts();
    }, 250));
});

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function initializeEventListeners() {
    document.getElementById('lang-toggle').addEventListener('click', toggleLanguage);
    document.getElementById('scale-toggle').addEventListener('click', toggleGpaScale);

    document.getElementById('course-search').addEventListener('input', (e) => {
        filterState.term = e.target.value.toLowerCase();
        renderCourseTable();
    });

    document.getElementById('btn-reset-filters').addEventListener('click', () => {
        resetFilters();
        tableState.sortKey = 'semester';
        tableState.sortOrder = 'asc';
        renderCourseTable();
        renderAllCharts();
    });

    document.getElementById('filter-semester').addEventListener('change', (e) => {
        resetFilters('semester');
        tableState.sortKey = 'semester';
        tableState.sortOrder = 'asc';
        filterState.semester = e.target.value;
        renderCourseTable();
    });

    const filterCategory = document.getElementById('filter-category');
    if (filterCategory) {
        filterCategory.addEventListener('change', (e) => {
            resetFilters('category');
            tableState.sortKey = 'semester';
            tableState.sortOrder = 'asc';
            filterState.category = e.target.value;
            renderCourseTable();
        });
    }

    document.querySelectorAll('#course-table th').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (tableState.sortKey === key) {
                tableState.sortOrder = tableState.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                tableState.sortKey = key;
                tableState.sortOrder = 'desc';
            }
            renderCourseTable();
        });
    });
}

function populateSemesterFilter() {
    const uniqueSemesters = Array.from(new Set(courseData.map(course => course.Semester)));
    sortSemesters(uniqueSemesters);

    const select = document.getElementById('filter-semester');
    select.innerHTML = '';

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.text = UI_TEXT[currentLanguage].filters.allSemesters;
    select.appendChild(allOption);

    uniqueSemesters.forEach(semester => {
        const option = document.createElement('option');
        option.value = semester;
        option.text = getLocalizedSemesterName(semester);
        select.appendChild(option);
    });
}

function populateCategoryFilter() {
    const uniqueCategories = Array.from(new Set(courseData.map(course => course.category))).sort();

    const select = document.getElementById('filter-category');
    if (!select) return;



    select.innerHTML = '';

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.text = UI_TEXT[currentLanguage].filters.allCategories;
    select.appendChild(allOption);

    uniqueCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.text = getLocalizedCategoryName(category);
        select.appendChild(option);
    });

    if (filterState.category) {
        select.value = filterState.category;
    }
}

function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'ko' : 'en';
    updateInterfaceText();
    populateSemesterFilter();
    populateCategoryFilter();
    renderAllCharts();
    renderCourseTable();
}

function toggleGpaScale() {
    if (gpaScale === '4.3') {
        gpaScale = '4.0';
    } else {
        gpaScale = '4.3';
    }
    document.getElementById('scale-toggle').innerText = gpaScale === '4.3' ? UI_TEXT[currentLanguage].scaleToggle40 : UI_TEXT[currentLanguage].scaleToggle43;

    courseData = parseCourseData(courseData.map(course => ({ ...course, points: undefined })));
    updateSummaryStatistics(courseData);
    renderGpaTrendChart();
    renderCourseTable();
}

function updateInterfaceText() {
    const text = UI_TEXT[currentLanguage];
    document.getElementById('page-title').innerText = text.title;
    document.getElementById('label-total-credits').innerText = text.totalCredits;
    document.getElementById('label-overall-gpa').innerText = text.overallGPA;
    document.getElementById('label-major-gpa').innerText = text.majorGPA;

    const convertedScoreLabel = document.getElementById('label-converted-score');
    if (convertedScoreLabel) convertedScoreLabel.innerText = text.convertedScore;


    document.getElementById('label-gpa-trend').innerText = text.gpaTrend;
    document.getElementById('label-grade-dist').innerText = text.gradeDist;
    document.getElementById('label-code-dist').innerText = text.codeDist;
    document.getElementById('label-credits-sem').innerText = text.creditsPerSem;
    document.getElementById('lang-toggle').innerText = text.toggleBtn;

    document.getElementById('label-course-list').innerText = text.courseList;
    document.getElementById('course-search').placeholder = text.searchPlaceholder;
    document.getElementById('th-semester').innerText = text.tableHeaders.semester;
    document.getElementById('th-code').innerText = text.tableHeaders.code;
    document.getElementById('th-title').innerText = text.tableHeaders.title;
    document.getElementById('th-category').innerText = text.tableHeaders.category;
    document.getElementById('th-credits').innerText = text.tableHeaders.credits;
    document.getElementById('th-grade').innerText = text.tableHeaders.grade;

    const filterSemSelect = document.getElementById('filter-semester');
    if (filterSemSelect.options.length > 0) {
        filterSemSelect.options[0].text = text.filters.allSemesters;
    }
    const filterCatSelect = document.getElementById('filter-category');
    if (filterCatSelect && filterCatSelect.options.length > 0) {
        filterCatSelect.options[0].text = text.filters.allCategories;
    }

    if (courseData.length > 0) {
        populateSemesterFilter();
        populateCategoryFilter();
    }

    document.getElementById('btn-reset-filters').innerText = text.filters.reset;
    document.getElementById('scale-toggle').innerText = gpaScale === '4.3' ? text.scaleToggle40 : text.scaleToggle43;

    const filteredStatsText = text.filteredStats;
    if (filteredStatsText) {
        const fsLabelCredits = document.getElementById('fs-label-credits');
        if (fsLabelCredits) fsLabelCredits.innerText = filteredStatsText.credits;

        const fsLabelGpa = document.getElementById('fs-label-gpa');
        if (fsLabelGpa) fsLabelGpa.innerText = filteredStatsText.gpa;

        const fsLabelMajor = document.getElementById('fs-label-major');
        if (fsLabelMajor) fsLabelMajor.innerText = filteredStatsText.majorGpa;
    }
}

function loadCourseData() {
    d3.csv("courses.csv").then(data => {
        courseData = parseCourseData(data);
        updateSummaryStatistics(courseData);
        populateSemesterFilter();
        populateCategoryFilter();
        renderAllCharts();
        renderCourseTable();
    }).catch(error => {
        console.error("Error loading CSV:", error);
    });
}

function parseCourseData(data) {
    const pointsMap = gpaScale === '4.3' ? SCALE_4_3 : SCALE_4_0;

    return data.map(record => {
        const grade = record.Grade ? record.Grade.trim() : '';
        let creditsString = record.Credits;
        if (typeof creditsString !== 'string') creditsString = String(creditsString);

        const credits = creditsString.includes('AU') ? 0 : parseFloat(creditsString);

        const category = record.Category ? record.Category.trim() : 'Other';
        const isMajorCourse = category === 'Major';

        const gradePoints = pointsMap[grade] !== undefined ? pointsMap[grade] : null;

        const courseCode = record['Course Code'] ? record['Course Code'].trim() : '';
        const coursePrefix = courseCode.match(/^[A-Z]+/) ? courseCode.match(/^[A-Z]+/)[0] : 'Other';

        return {
            ...record,
            numericCredits: credits,
            isMajor: isMajorCourse,
            category: category,
            points: gradePoints,
            validForGPA: gradePoints !== null,
            codePrefix: coursePrefix
        };
    });
}

function updateSummaryStatistics(data) {
    const totalCredits = d3.sum(data, course => course.numericCredits);

    const gpaEligibleData = data.filter(course => course.validForGPA);
    const totalGradePoints = d3.sum(gpaEligibleData, course => course.points * course.numericCredits);
    const totalGpaCredits = d3.sum(gpaEligibleData, course => course.numericCredits);
    const overallGPA = totalGpaCredits > 0 ? (Math.round((totalGradePoints / totalGpaCredits) * 100 + 0.00001) / 100).toFixed(2) : "0.00";

    const majorCourses = gpaEligibleData.filter(course => course.isMajor);
    const majorGradePoints = d3.sum(majorCourses, course => course.points * course.numericCredits);
    const majorGpaCredits = d3.sum(majorCourses, course => course.numericCredits);
    const majorGPA = majorGpaCredits > 0 ? (Math.round((majorGradePoints / majorGpaCredits) * 100 + 0.00001) / 100).toFixed(2) : "0.00";

    animateValue('val-total-credits', 0, totalCredits, 1500, '');
    animateValue('val-overall-gpa', 0, parseFloat(overallGPA), 1500, ' / ' + gpaScale, true);
    animateValue('val-major-gpa', 0, parseFloat(majorGPA), 1500, ' / ' + gpaScale, true);

    const totalPoints43 = d3.sum(gpaEligibleData, course => {
        const grade = course.Grade ? course.Grade.trim() : '';
        const pts = SCALE_4_3[grade] !== undefined ? SCALE_4_3[grade] : 0;
        return pts * course.numericCredits;
    });

    const gpa43 = totalGpaCredits > 0 ? (totalPoints43 / totalGpaCredits) : 0;
    const convertedScore = gpa43 > 0 ? (gpa43 * CONVERSION_SLOPE + CONVERSION_BASE).toFixed(1) : "0.0";

    const valConvertedElement = document.getElementById('val-converted-score');
    if (valConvertedElement) {
        animateValue('val-converted-score', 0, parseFloat(convertedScore), 1500, ' / 100', true);
    }
}

function animateValue(id, start, end, duration, suffix, isFloat = false) {
    const obj = document.getElementById(id);
    if (!obj) return;

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);

        const easeProgress = 1 - Math.pow(1 - progress, 4);

        const currentVal = progress * (end - start) + start;
        const displayVal = isFloat ? currentVal.toFixed(2) : Math.floor(currentVal);

        obj.innerHTML = displayVal + `<span style="font-size: 0.5em; color: #64748b; font-weight: 500; margin-left: 2px;">${suffix}</span>`;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            const finalVal = isFloat ? end.toFixed(2) : end;
            obj.innerHTML = finalVal + `<span style="font-size: 0.5em; color: #64748b; font-weight: 500; margin-left: 2px;">${suffix}</span>`;
        }
    };
    window.requestAnimationFrame(step);
}

function updateFilteredStatistics(data) {
    const totalCredits = d3.sum(data, course => course.numericCredits);

    const gpaEligibleData = data.filter(course => course.validForGPA);
    const totalGradePoints = d3.sum(gpaEligibleData, course => course.points * course.numericCredits);
    const totalGpaCredits = d3.sum(gpaEligibleData, course => course.numericCredits);
    const overallGPA = totalGpaCredits > 0 ? (Math.round((totalGradePoints / totalGpaCredits) * 100 + 0.00001) / 100).toFixed(2) : "-";

    const majorCourses = gpaEligibleData.filter(course => course.isMajor);
    const majorGradePoints = d3.sum(majorCourses, course => course.points * course.numericCredits);
    const majorGpaCredits = d3.sum(majorCourses, course => course.numericCredits);
    const majorGPA = majorGpaCredits > 0 ? (Math.round((majorGradePoints / majorGpaCredits) * 100 + 0.00001) / 100).toFixed(2) : "-";

    const elCredits = document.getElementById('fs-val-credits');
    const elGpa = document.getElementById('fs-val-gpa');
    const elMajor = document.getElementById('fs-val-major');

    if (elCredits) elCredits.textContent = totalCredits;
    if (elGpa) elGpa.textContent = overallGPA;
    if (elMajor) elMajor.textContent = majorGPA;
}

function renderAllCharts() {
    renderGpaTrendChart();
    renderGradeDistributionChart();
    renderCourseCodeDistributionChart();
    renderCreditsBySemesterChart();
}

function getLocalizedSemesterName(semesterString) {
    if (currentLanguage === 'en') return semesterString;
    const [year, term] = semesterString.split(' ');
    let localizedTerm = term;
    if (term === '1st') localizedTerm = '1학기';
    else if (term === '2nd') localizedTerm = '2학기';
    else if (term === 'Summer') localizedTerm = '여름학기';
    else if (term === 'Winter') localizedTerm = '겨울학기';

    return `${year} ${localizedTerm}`;
}

const chartTooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

function showChartTooltip(htmlContent, event) {
    chartTooltip.transition().duration(200).style("opacity", .9);
    chartTooltip.html(htmlContent)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
}

function hideChartTooltip() {
    chartTooltip.transition().duration(500).style("opacity", 0);
}

function createChartSvg(containerId, margin) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    return {
        svg,
        width,
        height,
        chartWidth: width - margin.left - margin.right,
        chartHeight: height - margin.top - margin.bottom
    };
}

function createPieChartSvg(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const width = container.clientWidth;
    const height = container.clientHeight;
    const radius = Math.min(width, height) / 2 - 20;

    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

    return { svg, radius };
}

function renderGpaTrendChart() {
    const isMobile = getIsMobile();
    const margin = { top: 20, right: isMobile ? 10 : 30, bottom: 40, left: isMobile ? 40 : 60 };
    const { svg, chartWidth, chartHeight } = createChartSvg('line-chart', margin);

    const uniqueSemesters = Array.from(new Set(courseData.map(course => course.Semester)));
    sortSemesters(uniqueSemesters);

    const semestersToDisplay = uniqueSemesters.filter(isRegularSemester);

    const trendData = semestersToDisplay.map(semester => {
        const semesterCourses = courseData.filter(course => course.Semester === semester && course.validForGPA);

        const totalPoints = d3.sum(semesterCourses, course => course.points * course.numericCredits);
        const totalCredits = d3.sum(semesterCourses, course => course.numericCredits);
        const overallGPA = totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100 + 0.00001) / 100 : null;

        const majorCourses = semesterCourses.filter(course => course.isMajor);
        const majorPoints = d3.sum(majorCourses, course => course.points * course.numericCredits);
        const majorCredits = d3.sum(majorCourses, course => course.numericCredits);
        const majorGPA = majorCredits > 0 ? Math.round((majorPoints / majorCredits) * 100 + 0.00001) / 100 : null;

        return { semester, overallGPA, majorGPA };
    }).filter(d => d.overallGPA !== null || d.majorGPA !== null);

    const xScale = d3.scalePoint()
        .domain(trendData.map(d => d.semester))
        .range([0, chartWidth])
        .padding(0.1);

    let yMin, yMax, yTickValues;
    if (gpaScale === '4.3') {
        yMin = 3.7;
        yMax = 4.5;
        yTickValues = null;
    } else {
        yMin = 3.7;
        yMax = 4.1;
        yTickValues = [3.7, 3.8, 3.9, 4.0, 4.1];
    }

    const yScale = d3.scaleLinear()
        .domain([yMin, yMax])
        .range([chartHeight, 0]);

    svg.append('g')
        .attr('transform', `translate(0,${chartHeight})`)
        .call(d3.axisBottom(xScale).tickFormat(d => {
            if (isMobile) {
                const [year, term] = d.split(' ');
                const shortYear = year.slice(2);
                let shortTerm = term;
                if (term === '1st') shortTerm = '1';
                else if (term === '2nd') shortTerm = '2';
                else if (term === 'Summer') shortTerm = 'S';
                else if (term === 'Winter') shortTerm = 'W';
                return `${shortYear}-${shortTerm}`;
            }
            return getLocalizedSemesterName(d);
        }))
        .selectAll("text")
        .style("text-anchor", "middle")
        .style("font-size", isMobile ? "10px" : "12px")
        .attr("dx", "0")
        .attr("dy", "1em")
        .attr("transform", "rotate(0)");

    let yAxis = d3.axisLeft(yScale);
    if (yTickValues) {
        yAxis = yAxis.tickValues(yTickValues).tickFormat(d3.format(".1f"));
    }

    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(yScale)
            .tickSize(-chartWidth)
            .tickFormat("")
        )
        .style("stroke-dasharray", ("3, 3"))
        .style("opacity", 0.1);

    svg.append('g').call(yAxis)
        .style("font-size", isMobile ? "10px" : "12px");

    const overallLine = d3.line()
        .defined(d => d.overallGPA !== null)
        .curve(d3.curveMonotoneX)
        .x(d => xScale(d.semester))
        .y(d => yScale(d.overallGPA));

    const majorLine = d3.line()
        .defined(d => d.majorGPA !== null)
        .curve(d3.curveMonotoneX)
        .x(d => xScale(d.semester))
        .y(d => yScale(d.majorGPA));

    const pathOverall = svg.append('path')
        .datum(trendData)
        .attr('class', 'line-overall')
        .attr('fill', 'none')
        .attr('stroke', CHART_COLORS.total)
        .attr('stroke-width', isMobile ? 3 : 4)
        .attr('d', overallLine)
        .style('filter', 'drop-shadow(0px 4px 6px rgba(0, 58, 112, 0.2))')
        .style('transition', 'opacity 0.3s');

    const totalLengthOverall = pathOverall.node().getTotalLength();
    pathOverall
        .attr("stroke-dasharray", totalLengthOverall + " " + totalLengthOverall)
        .attr("stroke-dashoffset", totalLengthOverall)
        .transition()
        .duration(1500)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);

    const pathMajor = svg.append('path')
        .datum(trendData)
        .attr('class', 'line-major')
        .attr('fill', 'none')
        .attr('stroke', CHART_COLORS.major)
        .attr('stroke-width', isMobile ? 3 : 4)
        .attr('d', majorLine)
        .style('filter', 'drop-shadow(0px 4px 6px rgba(100, 204, 201, 0.2))')
        .style('transition', 'opacity 0.3s');

    const totalLengthMajor = pathMajor.node().getTotalLength();
    pathMajor
        .attr("stroke-dasharray", totalLengthMajor + " " + totalLengthMajor)
        .attr("stroke-dashoffset", totalLengthMajor)
        .transition()
        .duration(1500)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);

    const drawDataPoints = (key, color, label) => {
        svg.selectAll(`.dot-${key}`)
            .data(trendData.filter(d => d[key] !== null))
            .enter()
            .append('circle')
            .attr('class', `dot-${key}`)
            .attr('cx', d => xScale(d.semester))
            .attr('cy', d => yScale(d[key]))
            .attr('r', 0)
            .attr('fill', color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .style('transition', 'opacity 0.3s')
            .on('mouseover', function (event, d) {
                if (d3.select(this).style('opacity') === '0.1') return;

                d3.select(this).transition().duration(200).attr('r', 8);
                const val = d[key] ? d[key].toFixed(2) : '-';
                const html = `
                    <strong>${getLocalizedSemesterName(d.semester)}</strong><br/>
                    <span style="color:${color}">●</span> ${label}: ${val}
                `;
                showChartTooltip(html, event);
            })
            .on('mouseout', function () {
                if (d3.select(this).style('opacity') === '0.1') return;
                d3.select(this).transition().duration(200).attr('r', isMobile ? 4 : 6);
                hideChartTooltip();
            })
            .transition()
            .delay(1000)
            .duration(500)
            .attr('r', isMobile ? 4 : 6);
    };

    drawDataPoints('overallGPA', CHART_COLORS.total, UI_TEXT[currentLanguage].overallGPA);
    drawDataPoints('majorGPA', CHART_COLORS.major, UI_TEXT[currentLanguage].majorGPA);

    const legendX = isMobile ? chartWidth - 110 : chartWidth - 140;
    const legendY = isMobile ? chartHeight - 50 : 0;

    const legend = svg.append('g')
        .attr('transform', `translate(${legendX}, ${legendY})`);

    let focusedKey = null;

    const toggleFocus = (key) => {
        if (focusedKey === key) {
            focusedKey = null;
            d3.selectAll('.line-overall, .dot-overallGPA').style('opacity', 1).style('pointer-events', 'auto');
            d3.selectAll('.line-major, .dot-majorGPA').style('opacity', 1).style('pointer-events', 'auto');
            d3.select('#legend-overall').style('opacity', 1);
            d3.select('#legend-major').style('opacity', 1);
        } else {
            focusedKey = key;
            if (key === 'overall') {
                d3.selectAll('.line-overall, .dot-overallGPA').style('opacity', 1).style('pointer-events', 'auto');
                d3.selectAll('.line-major, .dot-majorGPA').style('opacity', 0.1).style('pointer-events', 'none');
                d3.select('#legend-overall').style('opacity', 1);
                d3.select('#legend-major').style('opacity', 0.5);
            } else {
                d3.selectAll('.line-overall, .dot-overallGPA').style('opacity', 0.1).style('pointer-events', 'none');
                d3.selectAll('.line-major, .dot-majorGPA').style('opacity', 1).style('pointer-events', 'auto');
                d3.select('#legend-overall').style('opacity', 0.5);
                d3.select('#legend-major').style('opacity', 1);
            }
        }
    };

    const legendFontSize = isMobile ? '12px' : '18px';
    const legendGap = isMobile ? 20 : 30;

    const legendOverall = legend.append('g')
        .attr('id', 'legend-overall')
        .style('cursor', 'pointer')
        .on('click', () => toggleFocus('overall'))
        .on('mouseover', (event) => showChartTooltip(UI_TEXT[currentLanguage].legendHint, event))
        .on('mouseout', hideChartTooltip);

    legendOverall.append('rect')
        .attr('x', 0).attr('y', 0).attr('width', isMobile ? 10 : 14).attr('height', isMobile ? 10 : 14)
        .attr('fill', CHART_COLORS.total)
        .attr('opacity', 0).transition().delay(500).duration(500).attr('opacity', 1);

    legendOverall.append('text')
        .attr('x', isMobile ? 15 : 20).attr('y', isMobile ? 9 : 12)
        .text(UI_TEXT[currentLanguage].overallGPA)
        .style('font-size', legendFontSize)
        .attr('opacity', 0).transition().delay(500).duration(500).attr('opacity', 1);

    const legendMajor = legend.append('g')
        .attr('id', 'legend-major')
        .style('cursor', 'pointer')
        .on('click', () => toggleFocus('major'))
        .on('mouseover', (event) => showChartTooltip(UI_TEXT[currentLanguage].legendHint, event))
        .on('mouseout', hideChartTooltip);

    legendMajor.append('rect')
        .attr('x', 0).attr('y', legendGap).attr('width', isMobile ? 10 : 14).attr('height', isMobile ? 10 : 14)
        .attr('fill', CHART_COLORS.major)
        .attr('opacity', 0).transition().delay(500).duration(500).attr('opacity', 1);

    legendMajor.append('text')
        .attr('x', isMobile ? 15 : 20).attr('y', legendGap + (isMobile ? 9 : 12))
        .text(UI_TEXT[currentLanguage].majorGPA)
        .style('font-size', legendFontSize)
        .attr('opacity', 0).transition().delay(500).duration(500).attr('opacity', 1);
}

function renderGradeDistributionChart() {
    const { svg, radius } = createPieChartSvg('pie-chart');

    const validData = courseData.filter(d => d.Grade !== 'AU');
    const gradeCounts = d3.rollup(validData, v => d3.sum(v, d => d.numericCredits), d => d.Grade);
    const pieData = Array.from(gradeCounts, ([grade, count]) => ({ grade, count }))
        .filter(d => d.grade && d.grade !== '');

    const gradeOrder = Object.keys(SCALE_4_3);
    pieData.sort((a, b) => {
        const idxA = gradeOrder.indexOf(a.grade);
        const idxB = gradeOrder.indexOf(b.grade);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        return b.count - a.count;
    });

    const gradientColors = generateGradientColors(pieData.length);

    const colorScale = d3.scaleOrdinal()
        .domain(pieData.map(d => d.grade))
        .range(gradientColors);

    const pie = d3.pie()
        .value(d => d.count)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(radius * 0.5)
        .outerRadius(radius);

    const arcs = svg.selectAll('arc')
        .data(pie(pieData))
        .enter()
        .append('g')
        .attr('class', 'arc');

    arcs.append('path')
        .attr('d', arc)
        .attr('fill', d => colorScale(d.data.grade))
        .attr('stroke', 'white')
        .style('stroke-width', '2px')
        .style('cursor', 'pointer')
        .style('opacity', 0)
        .transition()
        .duration(800)
        .attrTween('d', function (d) {
            const i = d3.interpolate(d.startAngle + 0.1, d.endAngle);
            return function (t) {
                d.endAngle = i(t);
                return arc(d);
            }
        })
        .style('opacity', 0.8);

    svg.selectAll('path')
        .on('click', function (event, d) {
            const grade = d.data.grade;
            const alreadySelected = filterState.grade === grade;

            resetFilters('grade');

            tableState.sortKey = 'semester';
            tableState.sortOrder = 'asc';

            if (!alreadySelected) {
                filterState.grade = grade;
            }

            renderCourseTable();
            document.getElementById('course-table').scrollIntoView({ behavior: 'smooth' });
        })
        .on('mouseover', function (event, d) {
            d3.select(this).transition().duration(200)
                .style('opacity', 1)
                .attr('transform', 'scale(1.05)')
                .style("filter", "drop-shadow(0 0 8px rgba(0, 0, 0, 0.2))");

            const text = UI_TEXT[currentLanguage];
            const percent = ((d.endAngle - d.startAngle) / (2 * Math.PI) * 100).toFixed(1);
            const html = `
                <strong>${d.data.grade}</strong><br/>
                ${text.credits}: ${d.data.count}<br/>
                ${percent}%<br/>
                <span style="font-size: 0.8em; color: #ddd;">${text.filterHint}</span>
            `;
            showChartTooltip(html, event);
        })
        .on('mouseout', function (event, d) {
            d3.select(this).transition().duration(200)
                .style('opacity', 0.8)
                .attr('transform', 'scale(1)')
                .style("filter", "none");
            hideChartTooltip();
        });

    arcs.append('text')
        .attr('transform', d => `translate(${arc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .text(d => d.data.count > 0 ? d.data.grade : '')
        .style('font-size', '14px')
        .style('fill', '#fff')
        .style('pointer-events', 'none')
        .attr('opacity', 0)
        .transition()
        .delay(800)
        .duration(500)
        .attr('opacity', 1);
}

function renderCourseCodeDistributionChart() {
    const { svg, radius } = createPieChartSvg('code-chart');

    const validData = courseData.filter(d => d.Grade !== 'AU');
    const codeGroups = d3.group(validData, course => course.codePrefix);
    const pieData = Array.from(codeGroups, ([prefix, courses]) => ({
        prefix,
        count: d3.sum(courses, c => c.numericCredits),
        courses: courses
    })).filter(d => d.prefix && d.prefix !== '');

    pieData.sort((a, b) => b.count - a.count);

    const gradientColors = generateGradientColors(pieData.length);

    const colorScale = d3.scaleOrdinal()
        .domain(pieData.map(d => d.prefix))
        .range(gradientColors);

    const pie = d3.pie()
        .value(d => d.count)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(radius * 0.5)
        .outerRadius(radius);

    const arcs = svg.selectAll('arc')
        .data(pie(pieData))
        .enter()
        .append('g')
        .attr('class', 'arc');

    arcs.append('path')
        .attr('d', arc)
        .attr('fill', d => colorScale(d.data.prefix))
        .attr('stroke', 'white')
        .style('stroke-width', '2px')
        .style('cursor', 'pointer')
        .style('opacity', 0)
        .transition()
        .duration(800)
        .attrTween('d', function (d) {
            const i = d3.interpolate(d.startAngle + 0.1, d.endAngle);
            return function (t) {
                d.endAngle = i(t);
                return arc(d);
            }
        })
        .style('opacity', 0.8);

    svg.selectAll('path')
        .on('click', function (event, d) {
            const prefix = d.data.prefix;
            const alreadySelected = filterState.codePrefix === prefix;

            resetFilters('codePrefix');

            tableState.sortKey = 'semester';
            tableState.sortOrder = 'asc';

            if (!alreadySelected) {
                filterState.codePrefix = prefix;
            }

            renderCourseTable();
            document.getElementById('course-table').scrollIntoView({ behavior: 'smooth' });
        })
        .on('mouseover', function (event, d) {
            d3.select(this).transition().duration(200)
                .style('opacity', 1)
                .attr('transform', 'scale(1.05)')
                .style("filter", "drop-shadow(0 0 8px rgba(0, 0, 0, 0.2))");

            const text = UI_TEXT[currentLanguage];
            const percent = ((d.endAngle - d.startAngle) / (2 * Math.PI) * 100).toFixed(1);

            const html = `
                <div style="text-align: center;">
                    <strong>${d.data.prefix}</strong><br/>
                    ${text.credits}: ${d.data.count}<br/>
                    ${percent}%<br/>
                    <span style="font-size: 0.8em; color: #ddd;">${text.filterHint}</span>
                </div>
            `;
            showChartTooltip(html, event);
        })
        .on('mouseout', function (event, d) {
            d3.select(this).transition().duration(200)
                .style('opacity', 0.8)
                .attr('transform', 'scale(1)')
                .style("filter", "none");
            hideChartTooltip();
        });

    arcs.append('text')
        .attr('transform', d => `translate(${arc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .text(d => d.data.count > 0 ? d.data.prefix : '')
        .style('font-size', '12px')
        .style('fill', '#fff')
        .style('pointer-events', 'none')
        .attr('opacity', 0)
        .transition()
        .delay(800)
        .duration(500)
        .attr('opacity', 1);
}

function renderCreditsBySemesterChart() {
    const isMobile = getIsMobile();
    const margin = { top: 20, right: isMobile ? 10 : 30, bottom: 40, left: isMobile ? 40 : 60 };
    const { svg, chartWidth, chartHeight } = createChartSvg('bar-chart', margin);

    const uniqueSemesters = Array.from(new Set(courseData.map(course => course.Semester)));
    sortSemesters(uniqueSemesters);

    const semestersToDisplay = uniqueSemesters.filter(isRegularSemester);

    const chartData = semestersToDisplay.map(semester => {
        const semesterCourses = courseData.filter(course => course.Semester === semester);
        const totalCredits = d3.sum(semesterCourses, course => course.numericCredits);
        return { semester, totalCredits };
    }).filter(d => d.totalCredits > 0);

    const xScale = d3.scaleBand()
        .domain(chartData.map(d => d.semester))
        .range([0, chartWidth])
        .padding(0.3);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.totalCredits) * 1.1])
        .range([chartHeight, 0]);

    svg.append('g')
        .attr('transform', `translate(0,${chartHeight})`)
        .call(d3.axisBottom(xScale).tickFormat(d => {
            if (isMobile) {
                const [year, term] = d.split(' ');
                const shortYear = year.slice(2);
                let shortTerm = term;
                if (term === '1st') shortTerm = '1';
                else if (term === '2nd') shortTerm = '2';
                else if (term === 'Summer') shortTerm = 'S';
                else if (term === 'Winter') shortTerm = 'W';
                return `${shortYear}-${shortTerm}`;
            }
            return getLocalizedSemesterName(d);
        }))
        .selectAll("text")
        .style("text-anchor", "middle")
        .style("font-size", isMobile ? "10px" : "12px")
        .attr("dx", "0")
        .attr("dy", "1em")
        .attr("transform", "rotate(0)");

    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(yScale)
            .tickSize(-chartWidth)
            .tickFormat("")
        )
        .style("stroke-dasharray", ("3, 3"))
        .style("opacity", 0.1);

    svg.append('g').call(d3.axisLeft(yScale))
        .style("font-size", isMobile ? "10px" : "12px");

    svg.selectAll(".bar")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("class", "bar clickable-chart-element")
        .attr("x", d => xScale(d.semester))
        .attr("width", xScale.bandwidth())
        .attr("y", chartHeight)
        .attr("height", 0)
        .attr("rx", 6)
        .attr("ry", 6)
        .attr("fill", CHART_COLORS.total)
        .on("click", function (event, d) {
            resetFilters('semester');

            tableState.sortKey = 'semester';
            tableState.sortOrder = 'asc';

            filterState.semester = d.semester;
            document.getElementById('filter-semester').value = d.semester;

            renderCourseTable();

            document.getElementById('course-table').scrollIntoView({ behavior: 'smooth' });
        })
        .on("mouseover", function (event, d) {
            d3.select(this).transition().duration(200)
                .attr("fill", CHART_COLORS.major)
                .style("filter", "drop-shadow(0 0 8px rgba(100, 204, 201, 0.4))");

            const text = UI_TEXT[currentLanguage];
            const html = `
                <strong>${getLocalizedSemesterName(d.semester)}</strong><br/>
                ${text.credits}: ${d.totalCredits}<br/>
                <span style="font-size: 0.8em; color: #aaa;">${text.filterHint}</span>
            `;
            showChartTooltip(html, event);
        })
        .on("mouseout", function () {
            d3.select(this).transition().duration(200)
                .attr("fill", CHART_COLORS.total)
                .style("filter", "none");
            hideChartTooltip();
        })
        .transition()
        .duration(800)
        .attr("y", d => yScale(d.totalCredits))
        .attr("height", d => chartHeight - yScale(d.totalCredits))
        .ease(d3.easeCubicOut);
}

function renderCourseTable() {
    const tbody = document.querySelector('#course-table tbody');
    tbody.innerHTML = '';

    let filteredData = courseData.filter(course => {
        const term = filterState.term;
        if (term) {
            const searchStr = `${course['Course Code']} ${course['Course Title (English)']} ${course['Course Title (Korean)']} ${course.Semester}`.toLowerCase();
            if (!searchStr.includes(term)) return false;
        }

        if (filterState.semester !== 'all' && course.Semester !== filterState.semester) {
            return false;
        }

        if (filterState.grade !== 'all' && course.Grade !== filterState.grade) {
            return false;
        }

        if (filterState.category !== 'all' && course.category !== filterState.category) {
            return false;
        }

        if (filterState.codePrefix !== 'all' && course.codePrefix !== filterState.codePrefix) {
            return false;
        }

        return true;
    });

    updateFilteredStatistics(filteredData);


    if (filteredData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="no-results">${UI_TEXT[currentLanguage].noResults}</td></tr>`;
        return;
    }

    const semesterOrder = SEMESTER_ORDER;
    filteredData.sort((a, b) => {
        let valueA, valueB;
        switch (tableState.sortKey) {
            case 'semester':
                const [yearA, termA] = a.Semester.split(' ');
                const [yearB, termB] = b.Semester.split(' ');
                if (yearA !== yearB) {
                    valueA = parseInt(yearA);
                    valueB = parseInt(yearB);
                } else {
                    valueA = semesterOrder[termA];
                    valueB = semesterOrder[termB];
                }
                break;
            case 'code':
                valueA = a['Course Code'];
                valueB = b['Course Code'];
                break;
            case 'title':
                valueA = currentLanguage === 'ko' ? a['Course Title (Korean)'] : a['Course Title (English)'];
                valueB = currentLanguage === 'ko' ? b['Course Title (Korean)'] : b['Course Title (English)'];
                break;
            case 'category':
                valueA = a.category;
                valueB = b.category;
                break;
            case 'credits':
                valueA = a.numericCredits;
                valueB = b.numericCredits;
                break;
            case 'grade':
                valueA = SCALE_4_3[a.Grade] !== undefined ? SCALE_4_3[a.Grade] : -1;
                valueB = SCALE_4_3[b.Grade] !== undefined ? SCALE_4_3[b.Grade] : -1;
                break;
            default:
                valueA = 0; valueB = 0;
        }

        if (valueA < valueB) return tableState.sortOrder === 'asc' ? -1 : 1;
        if (valueA > valueB) return tableState.sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    filteredData.forEach(course => {
        const tr = document.createElement('tr');

        const semester = getLocalizedSemesterName(course.Semester);
        const title = currentLanguage === 'ko' ? course['Course Title (Korean)'] : course['Course Title (English)'];

        let gradeClass = 'badge-pass';
        if (course.Grade.startsWith('A')) gradeClass = 'badge-excellent';
        else if (course.Grade.startsWith('B')) gradeClass = 'badge-good';
        else if (course.Grade.startsWith('C')) gradeClass = 'badge-average';
        else if (course.Grade.startsWith('D') || course.Grade === 'F' || course.Grade === 'U') gradeClass = 'badge-poor';

        tr.innerHTML = `
            <td>${semester}</td>
            <td style="font-family: monospace;">${course['Course Code']}</td>
            <td>${title}</td>
            <td>${getLocalizedCategoryName(course.category)}</td>
            <td>${course.Credits}</td>
            <td><span class="grade-badge ${gradeClass}">${course.Grade}</span></td>
        `;
        tbody.appendChild(tr);
    });
}
