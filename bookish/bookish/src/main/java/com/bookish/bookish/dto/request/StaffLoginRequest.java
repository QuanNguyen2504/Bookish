package com.bookish.bookish.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class StaffLoginRequest {

    private String username;
    private String password;

}