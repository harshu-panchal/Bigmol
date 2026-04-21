import Joi from 'joi';

export const updateStatusSchema = Joi.object({
    status: Joi.string().valid('shipped', 'delivered').required(),
    otp: Joi.when('status', {
        is: 'delivered',
        then: Joi.string().pattern(/^\d{6}$/).required().messages({
            'string.pattern.base': 'OTP must be exactly 6 digits.',
            'any.required': 'Delivery OTP is required to complete delivery.'
        }),
        otherwise: Joi.forbidden()
    })
});

export const locationUpdateSchema = Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required()
});
