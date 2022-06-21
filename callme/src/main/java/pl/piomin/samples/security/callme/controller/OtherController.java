/*******************************************************************************
 * created by        : sungyup.kim
 * creation date     : 2022-02-03
 *
 * Copyright (c) 2021 Samsung SDS.
 * All rights reserved.
 *******************************************************************************/

package pl.piomin.samples.security.callme.controller;


import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


/**
 * Class description
 *
 * @author sungyup.kim
 * @since 2022. 2. 3
 * @version 1.0
*/

@RestController
@RequestMapping("/other")
public class OtherController {
    @GetMapping("/api")
    public String ping() {
        return "Other api called";
    }
}
