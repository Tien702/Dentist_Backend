import db from "../models/index";
require('dotenv').config();
import _, { values } from 'lodash';
import emailService from './emailService';

const MAX_NUMBER_SCHEDULE = process.env.MAX_NUMBER_SCHEDULE;

let getTopDoctorHome = (limitInput) =>{
    return new Promise (async(resolve, reject) =>{
        try {
            
            let users = await db.User.findAll({
                limit: limitInput,
                where: {roleId: 'R2'},
                order: [['createdAt', 'DESC']],
                attributes:{
                    exclude: ['password']
                },
                include: [
                    { model: db.Allcode, as: 'positionData', attributes: ['valueEn','valueVi']},
                    { model: db.Allcode, as: 'genderData', attributes: ['valueEn','valueVi']}
                ],
                raw: true,
                nest: true
            })

            resolve({
                errCode: 0, 
                data: users
            })
        } catch (e) {
            //throw e;
            reject(e);
        }
    })
}

let getAllDoctors = () =>{
    return new Promise( async(resolve, reject) => {
        try {
            let doctors = await db.User.findAll({
                where: {roleId : 'R2'},
                attributes:{
                    exclude: ['password', 'image']
                }
            })


            resolve({
                errCode: 0,
                data: doctors
            })
        } catch (e) {
            reject(e);
        }
    })
}

let saveDetailInfoDoctors = (inputData) =>{
    return new Promise ( async(resolve, reject) =>{
        try {
            
            let checkObj = checkRequiredFields(inputData);
            if(checkObj.isValid === false){
                resolve({
                    errCode: 1,
                    errMessage: `Missing parameters: ${checkObj.element}`,
                })
            }else
            {
                
                // //upset to Markdown
                if(inputData.action === 'CREATE'){
                        await db.Markdown.create({
                        contentHTML: inputData.contentHTML,
                        contentMarkdown: inputData.contentMarkdown,
                        description: inputData.description,
                        doctorId: inputData.doctorId
                    })
                }else if(inputData.action === 'EDIT'){
                    let doctorMarkdown = await db.Markdown.findOne({
                        where: { doctorId: inputData.doctorId},
                        raw: false
                    })
                    if(doctorMarkdown){
                        doctorMarkdown.contentHTML = inputData.contentHTML;
                        doctorMarkdown.contentMarkdown = inputData.contentMarkdown;
                        doctorMarkdown.description = inputData.description;
                        doctorMarkdown.updateAt = new Date();
                        await doctorMarkdown.save();
                    }
                }
                //upsert to Doctor_Infor table
                let doctorInfo = await db.Doctor_Infor.findOne({
                    where: {
                        doctorId: inputData.doctorId,
                    },
                    raw: false
                })
                if(doctorInfo){
                    //update
                    doctorInfo.doctorId = inputData.doctorId;
                    doctorInfo.priceId = inputData.selectedPrice;
                    doctorInfo.provinceId = inputData.selectedProvince;
                    doctorInfo.paymentId = inputData.selectedPayment;
                    doctorInfo.nameClinic = inputData.nameClinic;
                    doctorInfo.addressClinic = inputData.addressClinic;
                    doctorInfo.note = inputData.note;
                    doctorInfo.specialtyId = inputData.specialtyId;
                    doctorInfo.clinicId = inputData.clinicId;
                    await doctorInfo.save()
                }else{
                    //create
                    await db.Doctor_Infor.create({
                        doctorId : inputData.doctorId,
                        priceId : inputData.selectedPrice,
                        provinceId : inputData.selectedProvince,
                        paymentId : inputData.selectedPayment,
                        nameClinic : inputData.nameClinic,
                        addressClinic : inputData.addressClinic,
                        note : inputData.note,
                        specialtyId : inputData.specialtyId,
                        clinicId : inputData.clinicId,
                    })
                }
                
                resolve({
                    errCode: 0,
                    errMessage: 'Save Info Doctor Succeed!'
                })
            }
        } catch (e) {
            reject(e);
        }
    })
}

let getDetailDoctorById = (inputId) =>{
    return new Promise ( async (resolve, reject) =>{
        try {
            if(!inputId){
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required parameters'
                })
            }else {
                let data = await db.User.findOne({
                    where: { id: inputId},
                    attributes:{
                        exclude:['password']
                    },
                    include: [
                        {
                            model: db.Markdown,
                            attributes: ['description','contentHTML','contentMarkdown']
                        },
                        {
                            model: db.Allcode, as: 'positionData', attributes: [ 'valueEn', 'valueVi']
                        },
                        {
                            model: db.Doctor_Infor,
                            attributes:{
                                exclude: ['id', 'doctorId']
                            },
                            include:[
                                { model: db.Allcode, as:'priceTypeData', attributes:['valueEn', 'valueVi']},
                                { model: db.Allcode, as:'provinceTypeData', attributes:['valueEn', 'valueVi']},
                                { model: db.Allcode, as:'paymentTypeData', attributes:['valueEn', 'valueVi']},
                            ]
                        },
                    ],
                    raw: false,
                    nest: true
                })
                if(data && data.image){
                    data.image = new Buffer(data.image, 'base64').toString('binary');
                }

                if(!data) data ={};

                resolve({
                    errCode: 0,
                    data: data
                })
            }
        } catch (e) {
            reject(e);
        }
    })
}

let bulkCreateSchedule = (data) =>{
    return new Promise (async (resolve, reject) =>{
        try {
            if(!data.arrSchedule || !data.doctorId || !data.formatedDate){
                resolve({
                    errCode: 1,
                    errMessage: "Missing required parameters!!"
                })
            }else{
                let schedule = data.arrSchedule;
                if(schedule && schedule.length > 0){
                    schedule = schedule.map(item =>{
                        item.maxNumber = MAX_NUMBER_SCHEDULE;
                        return item;
                    })
                }
                let existing = await db.Schedule.findAll({
                    where: { doctorId: data.doctorId, date: data.formatedDate},
                    attributes: ['timeType', 'date','doctorId','maxNumber'],
                    raw: true
                });
                let toCreate = _.differenceWith(schedule, existing, (a, b) =>{
                    return a.timeType === b.timeType && +a.date === +b.date;
                });
                console.log('Check Difference: ', toCreate);

                if(toCreate && toCreate.length > 0){
                    await db.Schedule.bulkCreate(toCreate);
                }
                resolve({
                    errCode: 0,
                    errMessage:'OK'
                })
            }
            

        } catch (e) {
            reject(e);
        }
    })
}

let getScheduleByDate = (doctorId, date) =>{
    return new Promise(async (resolve, reject) =>{
        try {
            
            if(!doctorId || !date){
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required parameters'
                })
            }else{
                let dataSchedule = await db.Schedule.findAll({
                    where: {
                        doctorId: doctorId,
                        date: date
                    },
                    include: [
                        { model: db.Allcode, as: 'timeTypeData', attributes: ['valueEn', 'valueVi']},
                        { model: db.User, as: 'doctorData', attributes: ['firstName', 'lastName']}
                    ],
                    raw: false,
                    nest: true
                })

                if(!dataSchedule) dataSchedule = [];

                resolve({
                    errCode: 0,
                    data: dataSchedule
                })
            }

        } catch (e) {
            reject(e);
        }
    })
}

let getExtraInfoDoctorById = (idInput) =>{
    return new Promise( async (resolve, reject) =>{
        try {
            
            if(!idInput){
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required parameters'
                })
            } else{
                
                let data = await db.Doctor_Infor.findOne({
                    where: {
                        doctorId: idInput
                    },
                    attributes:{
                        exclude: ['id', 'doctorId']
                    },
                    include:[
                        { model: db.Allcode, as: 'priceTypeData', attributes:['valueEn', 'valueVi']},
                        { model: db.Allcode, as: 'paymentTypeData', attributes:['valueEn', 'valueVi']},
                        { model: db.Allcode, as: 'provinceTypeData', attributes:['valueEn', 'valueVi']},
                    ],
                    raw: false,
                    nest: true
                })

                if(!data) data = {};
                resolve({
                    errCode: 0,
                    data: data
                })
            }

        } catch (e) {
            reject(e)
        }
    })
}

let getProfileDoctorById = (inputId) =>{
    return new Promise( async (resolve, reject) =>{
        try {
            
            if(!inputId){
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required parameters'
                })
            } else{
                
                let data = await db.User.findOne({
                    where: {
                        id: inputId
                    },
                    attributes:{
                        exclude: ['password']
                    },
                    include:[
                        { 
                            model: db.Markdown, 
                            attributes:['description', 'contentHTML','contentMarkdown']
                        },

                        { model: db.Allcode, as: 'positionData', attributes:['valueEn', 'valueVi']},

                        { 
                            model: db.Doctor_Infor,
                            attributes:{
                                exclude: ['id', 'doctorId']
                            },
                            include:[
                                { model: db.Allcode, as: 'priceTypeData', attributes:['valueEn', 'valueVi']},
                                { model: db.Allcode, as: 'paymentTypeData', attributes:['valueEn', 'valueVi']},
                                { model: db.Allcode, as: 'provinceTypeData', attributes:['valueEn', 'valueVi']},
                            ]
                        },
                    ],
                    raw: false,
                    nest: true
                })

                if(data && data.image){
                    data.image = new Buffer(data.image, 'base64').toString('binary');
                }

                if(!data) data ={};
                resolve({
                    errCode: 0,
                    data: data
                })
            }

        } catch (e) {
            reject(e)
        }
    })
}

let checkRequiredFields = (inputData) =>{
    let arrFields = ['doctorId', 'contentHTML', 'contentMarkdown', 'action',
                            'selectedPrice', 'selectedPayment', 'selectedProvince', 'nameClinic',
                            'addressClinic', 'specialtyId'
                    ]
    let isValid = true;
    let element = '';
    for( let i = 0; i < arrFields.length; i++){
        if(!inputData[arrFields[i]]){
            isValid = false;
            element = arrFields[i]
            break;
        }
    }
    return{
        isValid: isValid,
        element: element
    }
}

let getListPatientForDoctor = (doctorId, date) =>{
    return new Promise (async(resolve, reject)=>{
        try {
            if(!doctorId || !date){
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required parameters'
                })
            }else{
                let data = await db.Booking.findAll({
                    where: {
                        statusId: 'S2',
                        doctorId: doctorId,
                        date: date
                    },
                    include: [
                        {
                            model: db.User, as: 'patientData',
                            attributes: ['email', 'firstName', 'address', 'gender'],
                            include: [
                                {
                                    model: db.Allcode, as: 'genderData', attributes: ['valueEn', 'valueVi']
                                }
                            ]
                        },
                        {
                            model: db.Allcode, as: 'timeTypeDataPatient', attributes: ['valueEn', 'valueVi']
                        }
                    ],
                    raw: false,
                    nest: true
                })

                resolve({
                    errCode: 0,
                    data: data
                })
            }

        } catch (e) {
            reject(e);
        }
    })
}
let sendRemedy = (data) =>{
    return new Promise( async (resolve, reject) =>{
        try {
            if(!data.email || !data.doctorId || !data.patientId 
                ||!data.timeType || !data.imgBase64){
                resolve({
                    errCode: 1,
                    errMessage: 'Missing required parameters'
                })
            }else{
                //update patient status
                let appointment = await db.Booking.findOne({
                    where: {
                        doctorId: data.doctorId,
                        patientId: data.patientId,
                        timeType: data.timeType,
                        statusId: 'S2'
                    },
                    raw: false
                })
                if(appointment){
                    appointment.statusId = 'S3';
                    await appointment.save()
                }
                 //send email remedy
                 await emailService.sendAttachment(data)
                resolve({
                    errCode: 0,
                    errMessage: 'OK!'
                })
               
            }
        } catch (e) {
            reject(e);
        }
    })
}
module.exports ={
    getTopDoctorHome: getTopDoctorHome,
    getAllDoctors: getAllDoctors,
    saveDetailInfoDoctors: saveDetailInfoDoctors,
    getDetailDoctorById: getDetailDoctorById,
    bulkCreateSchedule: bulkCreateSchedule,
    getScheduleByDate: getScheduleByDate,
    getExtraInfoDoctorById: getExtraInfoDoctorById,
    getProfileDoctorById: getProfileDoctorById,
    checkRequiredFields: checkRequiredFields,
    getListPatientForDoctor: getListPatientForDoctor,
    sendRemedy:sendRemedy
}